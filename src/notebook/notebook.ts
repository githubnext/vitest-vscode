import * as vscode from 'vscode'
import JSON5 from 'json5'

interface TsNotebookData {
  cells: TsNotebookCell[]
}

interface TsNotebookCell {
  language: string
  value: string
  kind: vscode.NotebookCellKind
  editable?: boolean
}

export class TsNotebookSerializer implements vscode.NotebookSerializer {
  public readonly label: string = 'TypeScript Notebook Serializer'

  constructor() {
  }

  public async deserializeNotebook(data: Uint8Array, _token: vscode.CancellationToken): Promise<vscode.NotebookData> {
    const contents = new TextDecoder().decode(data)

    // Read file contents
    let raw: TsNotebookData
    try {
      raw = <TsNotebookData>JSON5.parse(contents)
    }
    catch {
      raw = { cells: [] }
    }

    const cells = raw.cells.map(item => new vscode.NotebookCellData(
      item.kind,
      item.value,
      item.language,
    ))

    return new vscode.NotebookData(cells,
    )
  }

  public async serializeNotebook(data: vscode.NotebookData, _token: vscode.CancellationToken): Promise<Uint8Array> {
    const contents: TsNotebookData = { cells: [] }

    for (const cell of data.cells) {
      contents.cells.push({
        kind: cell.kind,
        language: cell.languageId,
        value: cell.value,
      })
    }

    return new TextEncoder().encode(JSON5.stringify(contents))
  }
}

export class TsNotebookKernel {
  readonly id = 'ts-notebook-renderer-kernel'
  public readonly label = 'TypeScript Notebook Kernel'
  readonly supportedLanguages = ['json']

  private _executionOrder = 0
  private readonly _controller: vscode.NotebookController

  constructor() {
    this._controller = vscode.notebooks.createNotebookController(this.id, 'ts-notebook-renderer', this.label)

    this._controller.supportedLanguages = this.supportedLanguages
    this._controller.supportsExecutionOrder = true
    this._controller.executeHandler = this._executeAll.bind(this)
  }

  dispose(): void {
    this._controller.dispose()
  }

  private _executeAll(cells: vscode.NotebookCell[], _notebook: vscode.NotebookDocument, _controller: vscode.NotebookController): void {
    for (const cell of cells)
      this._doExecution(cell)
  }

  private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
    const execution = this._controller.createNotebookCellExecution(cell)

    execution.executionOrder = ++this._executionOrder
    execution.start(Date.now())

    try {
      execution.replaceOutput([new vscode.NotebookCellOutput([
        vscode.NotebookCellOutputItem.json(JSON.parse(cell.document.getText()), 'x-application/ts-notebook-renderer'),
        vscode.NotebookCellOutputItem.json(JSON.parse(cell.document.getText())),
      ])])

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
