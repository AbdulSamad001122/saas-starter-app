import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server"
import prisma from '@/lib/prisma';

const ITEMS_PER_PAGE = 10

export async function GET(req: Request) {
    const { userId } = await auth()

    if (!userId) {
        return new Response("Unauthorized User", { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const search = searchParams.get("search") || ""

    try {
        const todos = await prisma.todo.findMany({
            where: {
                userId,
                title: {
                    contains: search,
                    mode: "insensitive"
                }
            },

            orderBy: {
                createdAt: "desc"
            },
            take: ITEMS_PER_PAGE,
            skip: (page - 1) * ITEMS_PER_PAGE,
        })

        const total_items = await prisma.todo.count({
            where: {
                userId,
                title: {
                    contains: search,
                    mode: "insensitive"
                }
            }
        })

        const total_pages = Math.ceil(total_items / ITEMS_PER_PAGE)


        return NextResponse.json({
            todos,
            currentPage: page,
            total_pages,
        })

    } catch (error) {
        console.log("Error in getting todos from db", error)
        return new NextResponse("Internal server error", { status: 500 })
    }

}

export async function POST(req: Request) {
    const { userId } = await auth()

    if (!userId) {
        return new Response("Unauthorized User", { status: 400 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            include: {
                todos: true
            }
        })
        
        console.log(user)

        if (!user) {
            return NextResponse.json("User not found", { status: 404 })
        }


        if (!user.isSubscribed && user.todos.length >= 3) {
            return NextResponse.json("Free tier limit reached", { status: 400 })
        }

        const { title } = await req.json()

        const todo = await prisma.todo.create({
            data: {
                userId,
                title
            }
        })

        return NextResponse.json({
            message: "Todo created successfully",
            todo
        }, { status: 201 })

    } catch (error) {
        console.log("Error in creating todo", error)
        return new NextResponse("Internal server error", { status: 500 })
    }

}

