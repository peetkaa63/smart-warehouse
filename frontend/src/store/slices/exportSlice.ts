import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type ExportKind = 'excel' | 'pdf'

interface ExportState {
  inProgress: boolean
  kind?: ExportKind
  startedAt?: number
  jobId?: string
  progress?: number
  etaSeconds?: number
}

const initialState: ExportState = {
  inProgress: false
}

const exportSlice = createSlice({
  name: 'export',
  initialState,
  reducers: {
    startExport(state, action: PayloadAction<ExportKind>) {
      state.inProgress = true
      state.kind = action.payload
      state.startedAt = Date.now()
    },
    setExportJob(state, action: PayloadAction<{ jobId: string }>) {
      state.jobId = action.payload.jobId
    },
    updateExportProgress(state, action: PayloadAction<{ progress: number; etaSeconds?: number }>) {
      state.progress = action.payload.progress
      state.etaSeconds = action.payload.etaSeconds
    },
    finishExport(state) {
      state.inProgress = false
      state.kind = undefined
      state.startedAt = undefined
      state.jobId = undefined
      state.progress = undefined
      state.etaSeconds = undefined
    }
  }
})

export const { startExport, finishExport, setExportJob, updateExportProgress } = exportSlice.actions
export default exportSlice.reducer


