require("dotenv").config();

const express = require("express");
const {
	middleware,
	errorMiddleware,
} = require("@envoy/envoy-integrations-sdk");

if (!process.env.ENVOY_CLIENT_ID || !process.env.ENVOY_CLIENT_SECRET) {
	console.error(
		"Missing required environment variables ENVOY_CLIENT_ID and/or ENVOY_CLIENT_SECRET"
	);
	process.exit(1);
}

const app = express();

app.use(express.json());

app.use((req, res, next) => {
	next();
});

let globalConfig = {};

app.post("/duration", async (req, res) => {
	try {
		const allowedMinutes = req.body?.payload?.allowedMinutes;

		const errors = [];
		if (
			typeof allowedMinutes !== "number" ||
			!Number.isInteger(allowedMinutes)
		) {
			errors.push({
				field: "allowedMinutes",
				message: "Must be a whole number",
			});
		}

		if (allowedMinutes < 0 || allowedMinutes > 180) {
			errors.push({
				field: "allowedMinutes",
				message: "Must be between 0 and 180 minutes",
			});
		}

		if (errors.length > 0) {
			console.log("Validation failed:", errors);
			return res.json({ errors });
		}

		if (allowedMinutes !== undefined) {
			globalConfig.allowedMinutes = allowedMinutes;
		}

		return res.json({ errors: [] });
	} catch (error) {
		res.status(500).json({
			errors: [{ field: "general", message: "Internal server error" }],
		});
	}
});

app.post(
	"/visitor-sign-out",
	middleware({
		clientId: process.env.ENVOY_CLIENT_ID,
		clientSecret: process.env.ENVOY_CLIENT_SECRET,
		debug: true,
		rawBody: true,
		verifySignature: false
	}),
	async (req, res) => {
		try {
			const visitor = req.body.payload;
			
			if (!visitor?.attributes?.["signed-in-at"] || !visitor?.attributes?.["signed-out-at"]) {
				return res.sendFailed("Missing sign-in or sign-out time in visitor data");
			}

			const signInTime = new Date(visitor.attributes["signed-in-at"]);
			const signOutTime = new Date(visitor.attributes["signed-out-at"]);

			const stayDurationMinutes = Math.round(
				(signOutTime.getTime() - signInTime.getTime()) / (1000 * 60)
			);

			const allowedMinutes = req.body.meta?.config?.allowedMinutes ?? globalConfig.allowedMinutes;
			
			if (allowedMinutes === undefined) {
				return res.sendFailed("No duration limit configured");
			}

			const isOverstay = stayDurationMinutes > allowedMinutes;
			const status = isOverstay ? "Overstayed" : "Within Limit";
			const dashboardMessage = [
				`Status: ${status} |`,
				`Allotted Time for Visitors: ${allowedMinutes} minutes |`,
				`Duration of Visit: ${stayDurationMinutes} minutes |`,
				isOverstay
					? `Exceeded limit by ${stayDurationMinutes - allowedMinutes} minutes`
					: `Under limit by ${allowedMinutes - stayDurationMinutes} minutes`,
			].join("\n");

			return res.send({
				message: dashboardMessage,
				attachments: [{
					type: "text",
					label: "Summary",
					value: dashboardMessage,
					status: isOverstay ? "warning" : "success"
				}]
			});
		} catch (error) {
			console.error("Error processing webhook:", error);
			return res.sendFailed(error.message);
		}
	}
);

app.use(errorMiddleware());

process.on("uncaughtException", (error) => {
	console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
	console.error("Unhandled rejection:", error);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
