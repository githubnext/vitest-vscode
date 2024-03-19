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
