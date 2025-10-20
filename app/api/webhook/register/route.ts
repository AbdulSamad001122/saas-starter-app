import { Webhook } from "svix"
import { headers } from "next/headers"
import { WebhookEvent } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

export async function POST(req: Request) {
    // Add timeout to prevent webhook timeouts
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Webhook timeout')), 25000); // 25 second timeout
    });

    try {
        return await Promise.race([handleWebhook(req), timeoutPromise]) as Response;
    } catch (error: any) {
        console.error('Webhook processing error:', error);
        return new Response(`Webhook error: ${error.message}`, { status: 500 });
    }
}

async function handleWebhook(req: Request) {
    const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
        console.error("WEBHOOK_SECRET is not defined");
        return new Response("WEBHOOK_SECRET is not defined", { status: 500 });
    }

    const headerPayload = await headers();

    const svix_id = headerPayload.get("svix-id")
    const svix_timestamp = headerPayload.get("svix-timestamp")
    const svix_signature = headerPayload.get("svix-signature")

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response("svix_id, svix_timestamp, svix_signature are not defined")
    }

    const payload = await req.json()
    const body = JSON.stringify(payload)

    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent;

    try {
        evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as WebhookEvent;
    } catch (error) {
        console.log("Error in verifying webhook", error)
        return new Response("Error in verifying webhook", { status: 400 })
    }


    const { id } = evt.data
    const eventType = evt.type

    // logs

    if (eventType === "user.created") {
        try {
            const { email_addresses, primary_email_address_id, first_name, last_name } = evt.data;

            // Better error handling and logging
            console.log("Full webhook payload:", JSON.stringify(evt.data, null, 2));
            console.log("Email addresses:", email_addresses);
            console.log("Primary email ID:", primary_email_address_id);

            // Handle case where email_addresses is empty but primary_email_address_id exists
            let userEmail = null;

            if (email_addresses && email_addresses.length > 0) {
                // Try to find primary email first
                if (primary_email_address_id) {
                    const primaryEmail = email_addresses.find(
                        (email) => email.id === primary_email_address_id
                    );
                    if (primaryEmail) {
                        userEmail = primaryEmail.email_address;
                    }
                }

                // Fallback to first email if no primary email found
                if (!userEmail) {
                    userEmail = email_addresses[0].email_address;
                    console.log("Using first email as fallback:", userEmail);
                }
            } else {
                // If no email addresses in webhook, create user without email for now
                // This can happen in some Clerk configurations
                console.log("No email addresses provided in webhook, creating user without email");
                userEmail = `${evt.data.id}@temp.placeholder.com`; // Unique placeholder using user ID
            }

            // Check if user already exists to prevent duplicates
            const existingUser = await prisma.user.findUnique({
                where: { id: evt.data.id! }
            });

            if (existingUser) {
                console.log("User already exists:", existingUser);
                return new Response("User already exists", { status: 200 });
            }

            // creating a user in neon (postgres)
            const newUser = await prisma.user.create({
                data: {
                    id: evt.data.id!,
                    email: userEmail,
                    isSubscribed: false
                }
            });

            console.log("New user created successfully:", newUser);

        } catch (error : any) {
            console.error("Database error:", error);
            console.error("Error details:", error.message);
            return new Response(`Error creating user in database: ${error.message}`, { status: 400 });
        }
    }

    console.log(`Webhook processed successfully for event type: ${eventType}`);
    return new Response("Webhook received successfully", { status: 200 });
}
