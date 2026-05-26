export const getAllTasks = (req, res) => {
    res.status(201).json({ message: "getAllTasks" });
}

export const createTask = (req, res) => {
    res.status(201).json({ message: "createTask" });
}

export const updateTask = (req, res) => {
    res.status(201).json({ message: "updateTask" });
}

export const deleteTask = (req, res) => {
    res.status(201).json({ message: "deleteTask" });
}   
