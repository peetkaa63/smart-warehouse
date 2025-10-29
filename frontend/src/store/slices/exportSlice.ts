import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type ExportKind = 'excel' | 'pdf'

interface ExportState {
  inProgress: boolean
  kind?: ExportKind
  startedAt?: number
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
    finishExport(state) {
      state.inProgress = false
      state.kind = undefined
      state.startedAt = undefined
    }
  }
})

export const { startExport, finishExport } = exportSlice.actions
export default exportSlice.reducer


