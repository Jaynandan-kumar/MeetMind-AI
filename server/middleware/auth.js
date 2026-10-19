import { clerkClient, getAuth } from "@clerk/express"
import { sql } from "../config/db.js"

export const protect = async (req, res, next) =>{
    const auth = getAuth(req);
    const userId = auth?.userId || req.auth?.userId;

    if(!userId){
        return res.status(401).json({ error: "Not authorized, authentication required" });
    }

    req.user = {id: userId};

    let users = await sql`SELECT name, plan FROM users WHERE id = ${userId}`;

    if (users.length === 0) {
        let name = "User";
        let email = `${userId}@clerk.user`;
        let image = "";

        try {
            const clerkUser = await clerkClient.users.getUser(userId);
            if (clerkUser) {
                name = clerkUser.fullName || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || name;
                email = clerkUser.emailAddresses?.[0]?.emailAddress || email;
                image = clerkUser.imageUrl || image;
            }
        } catch (err) {
            console.log("Clerk fetch fallback for new user:", err.message);
        }

        const existingByEmail = await sql`SELECT id, plan FROM users WHERE email = ${email}`;
        if (existingByEmail.length > 0) {
            await sql`
                UPDATE users 
                SET id = ${userId}, name = ${name}, image = ${image}, updated_at = NOW() 
                WHERE email = ${email}
            `;
        } else {
            await sql`
                INSERT INTO users (id, name, email, image, plan)
                VALUES (${userId}, ${name}, ${email}, ${image}, 'free')
                ON CONFLICT (id) DO NOTHING
            `;
        }
    }

    next()
}

