import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server"
import prisma from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: { id: string } }) {

    const { userId } = await auth()

    if (!userId) {
        return new Response("Unauthorized User", { status: 400 })
    }

    try {
        const { completed } = await req.json()
        const todoId = params.id

        const todo = await prisma.todo.findUnique({
            where: {
                id: todoId,
            }
        })

        if (!todo) {
            return NextResponse.json({ error: "Todo not found" }, { status: 400 })
        }

        if (todo.userId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 400 })
        }

        const updatedTodo = await prisma.todo.update({
            where: {
                id: todoId,
            },
            data: {
                completed
            }
        })

        return NextResponse.json(updatedTodo)

    } catch (error) {
        return NextResponse.json({ error: "An error occured while updating the todo" }, { status: 500 })
    }

}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const { userId } = await auth()

    if (!userId) {
        return new Response("Unauthorized User", { status: 400 })
    }

    try {
        const todoId = params.id

        const todo = await prisma.todo.findUnique({
            where: {
                id: todoId
            }
        })

        if (!todo) {
            return NextResponse.json({ error: "Todo Not found" }, { status: 401 });
        }

        if (todo.userId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.todo.delete({
            where: {
                id: userId
            }
        })

        return NextResponse.json({ message: "Todo deleted successfully" }, { status: 200 });

    } catch (error) {
        console.error("Error deleting todo:", error);
        return NextResponse.json(
            { error: "An error occurred while deleting the todo" },
            { status: 500 }
        );

    }
}