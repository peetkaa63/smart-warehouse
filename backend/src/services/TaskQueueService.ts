type Task = {
  id: string
  priority?: number
  payload?: any
}

class TaskQueueService {
  private robotTasks: Map<string, Task[]> = new Map()
  private adminLogs: { ts: string; level: 'INFO'|'WARN'|'ERROR'; message: string; meta?: any }[] = []

  enqueue(robotId: string, task: Task) {
    const list = this.robotTasks.get(robotId) || []
    list.push(task)
    this.robotTasks.set(robotId, list)
    this.log('INFO', `Task enqueued for ${robotId}: ${task.id}`, { robotId, task })
  }

  dequeue(robotId: string): Task | undefined {
    const list = this.robotTasks.get(robotId) || []
    const t = list.shift()
    this.robotTasks.set(robotId, list)
    if (t) this.log('INFO', `Task dequeued for ${robotId}: ${t.id}`, { robotId, task: t })
    return t
  }

  getTasks(robotId: string): Task[] { return [...(this.robotTasks.get(robotId) || [])] }

  moveTasks(fromRobotId: string, toRobotId: string) {
    const src = this.robotTasks.get(fromRobotId) || []
    const dst = this.robotTasks.get(toRobotId) || []
    this.robotTasks.set(toRobotId, dst.concat(src))
    this.robotTasks.set(fromRobotId, [])
    this.log('WARN', `Tasks moved ${fromRobotId} -> ${toRobotId}`, { fromRobotId, toRobotId, count: src.length })
  }

  private log(level: 'INFO'|'WARN'|'ERROR', message: string, meta?: any) {
    const entry = { ts: new Date().toISOString(), level, message, meta }
    this.adminLogs.unshift(entry)
    if (this.adminLogs.length > 200) this.adminLogs = this.adminLogs.slice(0, 200)
  }

  getAdminLogs() { return this.adminLogs }
}

export const taskQueueService = new TaskQueueService()


