import { tool } from "@langchain/core/tools"
import { z } from "zod"
import { getTree, getFile, createFolder, createFile, updateFile, deleteFile, updateProjectDescription } from "../utils/fetchFileAPIs.js"

const compactTree = (items = []) => {
    return items.map((item) => ({
        _id: item._id,
        parentId: item.parentId,
        name: item.name,
        type: item.type,
        language: item.language,
        extension: item.extension,

        children: compactTree(
            item.children || []
        ),
    }))
}

export const fileTools = ({ projectId, userId }) => {
    const getTreeTool = tool(
        async () => {
            console.log("ai tool-get_tree")
            const result = await getTree({ projectId, userId })
            const tree = compactTree(result)
            return JSON.stringify({
                success: true,
                tree
            })
        },
        {
            name: "get_tree",
            description: "Get the complete project file and folder tree containing _id, parentId, name, and type (file/folder).",
        }
    )

    const getFileTool = tool(
        async ({ fileId }) => {
            console.log("ai tool-get_file")
            const file = await getFile({ userId, id: fileId })

            if (file && file.type != "file") {
                console.log("get file blocked , id is folder")
                return JSON.stringify({
                    success: false,
                    error: "The provided ID belongs to a folder, not a file.",
                    instruction: "Do not call get_file for folders. Use the folder ID as parentId."
                })
            }

            if (!file) {
                console.log("file not found")
                return JSON.stringify({
                    success: false,
                    error: "file not found",
                })
            }

            return JSON.stringify({
                success: true,
                file
            })
        },
        {
            name: "get_file",
            description: "Read file content by fileId. Never call with folder ID.",
            schema: z.object({
                fileId: z.string()
            })
        }
    )

    const createFolderTool = tool(
        async ({ name, parentId }) => {
            console.log("ai tool-create_folder")
            const folder = await createFolder({ projectId, userId, name, parentId })

            return JSON.stringify({
                success: true,
                operation: "folder_created",
                folder: {
                    _id: folder._id,
                    name: folder.name,
                    type: folder.type,
                    content: folder.content || "",
                    language: folder.language,
                    extension: folder.extension,
                    parentId: folder.parentId
                }
            })
        },
        {
            name: "create_folder",
            description: "Create a folder under parentId (or null for root).",
            schema: z.object({
                name: z.string(),
                parentId: z.string().nullable()
            })
        }
    )

    const createFileTool = tool(
        async ({ name, parentId, content, language }) => {
            console.log("ai tool-create_file")
            const file = await createFile({
                projectId,
                userId,
                name,
                parentId,
                content,
                language: language || "plaintext"
            })

            return JSON.stringify({
                success: true,
                operation: "file_created",
                file: {
                    _id: file._id,
                    name: file.name,
                    type: file.type,
                    parentId: file.parentId,
                    language: file.language,
                    content: file.content
                }
            })
        },
        {
            name: "create_file",
            description: "Create a new file with name, parentId (folder ID or null), content, and optional language.",
            schema: z.object({
                name: z.string(),
                parentId: z.string(),
                language: z.string().optional(),
                content: z.string()
            })
        }
    )

    const updateFileTool = tool(
        async ({ name, content, fileId }) => {
            console.log("ai tool-update_file")
            const file = await updateFile({ userId, name, content, id: fileId })

            return JSON.stringify({
                success: true,
                operation: "file_updated",
                file: {
                    _id: file._id,
                    name: file.name,
                    type: file.type,
                    parentId: file.parentId,
                    language: file.language,
                    content: file.content
                }
            })
        },
        {
            name: "update_file",
            description: "Update an existing file's content by fileId. Call get_file before updating.",
            schema: z.object({
                name: z.string(),
                content: z.string(),
                fileId: z.string()
            })
        }
    )

    const deleteFileTool = tool(
        async ({ fileId }) => {
            console.log("ai tool-delete_file")
            const file = await deleteFile({ userId, id: fileId })

            return JSON.stringify({
                success: true,
                operation: "file_deleted",
                file: {
                    _id: file._id,
                    name: file.name
                }
            })
        },
        {
            name: "delete_file",
            description: "Delete an existing file by fileId.",
            schema: z.object({
                fileId: z.string()
            })
        }
    )

    const updateProjectDescriptionTool = tool(
        async ({ description }) => {
            console.log("ai tool-update_project_description")
            const project = await updateProjectDescription({ projectId, description, userId })

            return JSON.stringify({
                success: true,
                operation: "project_updated",
                project: {
                    _id: project._id,
                    name: project.name,
                    description: project.description
                }
            })
        },
        {
            name: "update_project_description",
            description: "Update the project description displayed on the Dashboard project card.",
            schema: z.object({
                description: z.string().describe("The updated or added description text for this project.")
            })
        }
    )

    return [
        getTreeTool,
        getFileTool,
        createFolderTool,
        createFileTool,
        updateFileTool,
        deleteFileTool,
        updateProjectDescriptionTool
    ]
}

