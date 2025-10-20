import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server"
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    const { userId } = await auth()

    if (!userId) {
        return new Response("Unauthorized User", { status: 400 })
    }

    // capture payment
    try {

        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        })

        if (!user) {
            return new Response("User not found", { status: 400 })
        }

        const subscriptionEnds = new Date()
        subscriptionEnds.setMonth(subscriptionEnds.getMonth() + 1)


        const updatedUser = await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                isSubscribed: true,
                subscriptionEnds
            }
        })

        return NextResponse.json({
            message: "Subscription successful",
            subscriptionEnds: updatedUser.subscriptionEnds
        })

    } catch (error) {
        console.log("Error in updating subscription", error)
        return new NextResponse("Internal server error", { status: 500 })
    }


}

export async function GET(req: Request) {
    const { userId } = await auth()

    if (!userId) {
        return new Response("Unauthorized User", { status: 400 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                isSubscribed: true,
                subscriptionEnds: true
            }
        })

        if (!user) {
            return new Response("User not found", { status: 400 })
        }

        const now = new Date()


        if (user.subscriptionEnds && user.subscriptionEnds < now) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    isSubscribed: false,
                    subscriptionEnds: null
                }
            })
            return NextResponse.json({
                isSubscribed: false,
                subscriptionEnds: null
            })
        }

        return NextResponse.json({
            isSubscribed: user.isSubscribed,
            subscriptionEnds: user.subscriptionEnds
        })

    } catch (error) {
        console.log("Error in updating subscription", error)
        return new NextResponse("Internal server error", { status: 500 })
    }
}

