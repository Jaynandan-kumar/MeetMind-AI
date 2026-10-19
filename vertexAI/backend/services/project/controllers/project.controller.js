import Project from "../models/project.model.js"
import redis from "../../../shared/redis/redis.js"

export const createProject=async (req,res) => {
    try {
        const userId=req.headers["x-user-id"]
        if(!userId){
            return res.status(401).json({message:"userid is required"})
        }

        const {name,description}=req.body
        console.log("CREATING PROJECT:", { userId, name, description })

        const project=await Project.create({
            owner:userId,
            name,
            description
        })

        const key=`projects-${userId}`
        await redis.del(key)

        return res.status(201).json(project)

    } catch (error) {
        console.error("CREATE PROJECT ERROR:", error)
        return res.status(500).json({message:`create project error ${error}`})
    }
}

export const getProjects=async (req,res) => {
    try {
        const userId=req.headers["x-user-id"]
        if(!userId){
            return res.status(401).json({message:"userid is required"})
        }

        const key=`projects-${userId}`
        let result=await redis.get(key)
        if(result){
            return res.status(200).json(JSON.parse(result))
        }

        const projects=await Project.find({
            owner:userId
        }).sort({updatedAt:-1})

        await redis.set(key,JSON.stringify(projects))

        return res.status(200).json(projects)

    } catch (error) {
        return res.status(500).json({message:`get projects error ${error}`})
    }
}

export const getProjectById=async (req,res) => {
    try {
        const {id}=req.params

        const project=await Project.findById(id);
        if(!project){
            return res.status(404).json({message:"project not found"})
        }
        project.lastOpenedAt=new Date()
        await project.save()
        return res.status(200).json(project)

    } catch (error) {
        return res.status(500).json({message:`get project by id error ${error}`})
    }
}

export const getStarredProjects=async (req,res) => {
    try {
        const userId=req.headers["x-user-id"]
        if(!userId){
            return res.status(401).json({message:"userid is required"})
        }

        const key=`starred-projects-${userId}`
        let result=await redis.get(key)
        if(result){
            return res.status(200).json(JSON.parse(result))
        }

        const projects=await Project.find({
            owner:userId,
            starred:true
        }).sort({updatedAt:-1})

        await redis.set(key,JSON.stringify(projects))

        return res.status(200).json(projects)

    } catch (error) {
        return res.status(500).json({message:`get starred projects error ${error}`})
    }
}

export const toggleStar=async (req,res) => {
    try {
        const {id}=req.params
        const project=await Project.findById(id)
        if(!project){
            return res.status(404).json({message:"project not found"})
        }
        project.starred=!project.starred
        await project.save()

        const userId=req.headers["x-user-id"] || project.owner
        const key=`starred-projects-${userId}`
        await redis.del(key)
        await redis.del(`projects-${userId}`)

        return res.status(200).json(project)

    } catch (error) {
        return res.status(500).json({message:`toggle star error ${error}`})
    }
}

export const deleteProject=async (req,res) => {
    try {
        const {id}=req.params
        const project=await Project.findByIdAndDelete(id)
        if(!project){
            return res.status(404).json({message:"project not found"})
        }

        const userId=req.headers["x-user-id"] || project.owner
        const key=`projects-${userId}`
        await redis.del(key)
        await redis.del(`starred-projects-${userId}`)

        return res.status(200).json(project)

    } catch (error) {
        return res.status(500).json({message:`project delete error ${error}`})
    }
}

export const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ message: "project not found" });
        }

        if (name !== undefined) project.name = name;
        if (description !== undefined) project.description = description;

        await project.save();

        const userId = req.headers["x-user-id"] || project.owner;
        await redis.del(`projects-${userId}`);
        await redis.del(`starred-projects-${userId}`);

        return res.status(200).json(project);
    } catch (error) {
        return res.status(500).json({ message: `update project error ${error}` });
    }
}



