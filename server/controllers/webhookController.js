import { verifyWebhook } from "@clerk/express/webhooks"
import { sql } from "../config/db.js";

export const handleClerkWebhook = async (req, res) => {
    try {
        const evt = await verifyWebhook(req)

        const eventType = evt.type;
        const data = evt.data;

        switch (eventType) {
            case "user.created": {
                const userId = data.id;
                const primaryEmail = data.email_addresses?.[0]?.email_address || "";
                const name = `${data.first_name || "User"} ${data.last_name}`;
                const image = data.image_url || "";
                const plan = "free";

                const existingUser = await sql`SELECT id FROM users WHERE email = ${primaryEmail}`;
                if (existingUser.length > 0) {
                    await sql`
                        UPDATE users
                        SET id = ${userId}, name = ${name}, image = ${image}, plan = ${plan}, updated_at = NOW()
                        WHERE email = ${primaryEmail}
                    `;
                } else {
                    await sql`
                    INSERT INTO users (id, name, email, image, plan)
                    VALUES (${userId}, ${name}, ${primaryEmail}, ${image}, ${plan})
                    ON CONFLICT (id) DO UPDATE SET
                    id = EXCLUDED.id,
                    email = COALESCE(NULLIF(EXCLUDED.email, ''), users.email),
                    name = EXCLUDED.name,
                    image = EXCLUDED.image,
                    plan = EXCLUDED.plan,
                    updated_at = NOW()`;
                }
                break;
            }

            case "user.updated": {
                const userId = data.id;
                const primaryEmail = data.email_addresses?.[0]?.email_address || "";
                const name = `${data.first_name || "User"} ${data.last_name}`;
                const image = data.image_url || "";
                const metaPlan = data.public_metadata?.plan || data.private_metadata?.plan;

                await sql`
                INSERT INTO users (id, name, email, image)
                VALUES (${userId}, ${name}, ${primaryEmail}, ${image})
                ON CONFLICT (id) DO UPDATE SET
                id = EXCLUDED.id,
                email = EXCLUDED.email,
                name = EXCLUDED.name,
                image = EXCLUDED.image,
                plan = COALESCE(${metaPlan || null}, users.plan),
                updated_at = NOW()`;
                break;
            }

            case "subscription.created":
            case "subscription.updated":
            case "subscription.active":
            case "payment_attempt.succeeded": {
                const userId = data.user_id || data.customer?.user_id || data.payer?.user_id;
                const status = data.status || "active";
                const isPaid = status === "active" || status === "paid";
                const plan = isPaid ? "premium" : "free";

                if (userId) {
                    await sql`UPDATE users SET plan = ${plan}, updated_at = NOW() WHERE id = ${userId}`;
                    console.log(`Clerk billing event: user ${userId} plan set to ${plan}`);
                }
                break;
            }

            case "subscription.deleted":
            case "subscription.cancelled": {
                const userId = data.user_id || data.customer?.user_id;
                if (userId) {
                    await sql`UPDATE users SET plan = 'free', updated_at = NOW() WHERE id = ${userId}`;
                    console.log(`Clerk billing subscription ended: user ${userId} set to free`);
                }
                break;
            }

            default:
                console.log(`Unhandled Clerk webhook event type: ${eventType}`);
        }

        return res.status(200).json({ success: true, eventType });
    } catch (err) {
        console.error("Error verifying Clerk webhook:", err.message || err);
        return res.status(400).json({ error: "Webhook verification failed: " + (err.message || err) });
    }
}
