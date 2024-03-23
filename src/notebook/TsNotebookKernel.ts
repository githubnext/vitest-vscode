import * as vscode from 'vscode'
import type { CellOutput } from 'vitest'
import { ApiProcess } from '../pure/ApiProcess'
import { getVitestCommand } from '../pure/utils'

function cellOutputToNotebookCellOutput(cellOutput: CellOutput) {
  return new vscode.NotebookCellOutput(cellOutput.items.map((item) => {
    const data = new Uint8Array(item.data)
    return new vscode.NotebookCellOutputItem(data, item.mime)
  }))
}

export class TsNotebookKernel {
  readonly id = 'ts-notebook-renderer-kernel'
  public readonly label = 'TypeScript Notebook Kernel'
  readonly supportedLanguages = ['typescriptreact', 'typescript', 'javascriptreact', 'javascript']

  private _executionOrder = 0
  private readonly _controller: vscode.NotebookController
  private readonly _apiProcess: ApiProcess

  constructor(private _workspace: string) {
    // `ts-notebook` here matches the one in `registerNotebookSerializer` and in `package.json`
    this._controller = vscode.notebooks.createNotebookController(this.id, 'ts-notebook', this.label)

    this._controller.supportedLanguages = this.supportedLanguages
    this._controller.supportsExecutionOrder = true
    this._controller.executeHandler = this._executeAll.bind(this)

    const vitest = getVitestCommand(this._workspace) ?? { cmd: 'npx', args: ['vitest'] }
    this._apiProcess = new ApiProcess(vitest, this._workspace, {}, false)
    this._apiProcess.start()
  }

  dispose(): void {
    this._controller.dispose()
  }

  private _executeAll(cells: vscode.NotebookCell[], _notebook: vscode.NotebookDocument, _controller: vscode.NotebookController): void {
    for (const cell of cells)
      this._doExecution(_notebook.uri.fsPath, cell)
  }

  private async _doExecution(path: string, cell: vscode.NotebookCell): Promise<void> {
    const execution = this._controller.createNotebookCellExecution(cell)

    execution.executionOrder = ++this._executionOrder
    execution.start(Date.now())

    try {
      // TODO(jaked) should await server start / client connection
      const client = this._apiProcess.client
      if (!client)
        throw new Error('Vitest client not available')

      const cellOutput = await client.rpc.executeCell(path, cell.metadata.id, cell.document.languageId, cell.document.getText())
      const notebookCellOutput = cellOutputToNotebookCellOutput(cellOutput)
      execution.replaceOutput(notebookCellOutput)

      execution.end(true, Date.now())
    }
    catch (err) {
      execution.replaceOutput([new vscode.NotebookCellOutput([
        vscode.NotebookCellOutputItem.error(err),
      ])])
      execution.end(false, Date.now())
    }
  }
}
