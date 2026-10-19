import { createSlice } from "@reduxjs/toolkit";

const projectSlice = createSlice({
    name: "project",
    initialState: {
        projects: [],
        starredProjects: [],
        currentProject: null
    },
    reducers: {
        setProjects: (state, action) => {
            state.projects = action.payload
        },
        setCurrentProject: (state, action) => {
            state.currentProject = action.payload
        },
        addNewProject: (state, action) => {
            state.projects.unshift(action.payload)
        },
        setStarredProjects: (state, action) => {
            state.starredProjects = action.payload
        },
        starProject: (state, action) => {
            const project = state.projects.find(p => p?._id == action.payload)
            if (project) {
                project.starred = !project.starred
            }
        },
        setDeleteProject: (state, action) => {
            state.projects = state.projects.filter(p => p?._id != action.payload)
        },
        updateProjectDetails: (state, action) => {
            const { _id, description, name } = action.payload || {};
            if (state.currentProject && state.currentProject._id === _id) {
                if (description !== undefined) state.currentProject.description = description;
                if (name !== undefined) state.currentProject.name = name;
            }
            const p = state.projects.find(item => item?._id === _id);
            if (p) {
                if (description !== undefined) p.description = description;
                if (name !== undefined) p.name = name;
            }
            const sp = state.starredProjects.find(item => item?._id === _id);
            if (sp) {
                if (description !== undefined) sp.description = description;
                if (name !== undefined) sp.name = name;
            }
        }
    }
})

export const { setProjects, setCurrentProject, addNewProject, setStarredProjects, starProject, setDeleteProject, updateProjectDetails } = projectSlice.actions
export default projectSlice.reducer
