import * as vscode from 'vscode';

export default class CobolDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

    public async provideDocumentSymbols(document: vscode.TextDocument,token: vscode.CancellationToken): Promise<vscode.DocumentSymbol[]>{
        let symbol: vscode.DocumentSymbol[] = [];
        symbol = await this.buildDocumentSymbol(document,symbol);
        return symbol;
    }

    private buildDocumentSymbol(document: vscode.TextDocument, symbol: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
        let line: number | undefined;
        let range1: vscode.Range | undefined;
        let range2: vscode.Range | undefined;

        line = this.lineOfProcedureDivition(document);

        if (line) {
            range1 = this.getNextSymbolRange(document,line);
        }

        while (range1) {
            range2 = this.getNextSymbolRange(document,range1.start.line);
            if (range2) {
                symbol.push(
                    new vscode.DocumentSymbol(
                        document.getText(range1).substring(7),
                        "",
                        5,
                        new vscode.Range(range1.start,range2.start),
                        range1
                    )
                )
            } else {
                symbol.push(
                    new vscode.DocumentSymbol(
                        document.getText(range1).substring(7),
                        "",
                        5,
                        new vscode.Range(range1.start,new vscode.Position(document.lineCount,0)),
                        range1
                    )
                )
            }

            range1 = range2;
        }
        return symbol;
    }

    private lineOfProcedureDivition (document:vscode.TextDocument): number | undefined {
        const regProcedure = new RegExp("^.{6} PROCEDURE DIVISION","i");
        let i: number;
        for (i = 0;i < document.lineCount;i++) {
            if (document.lineAt(i).text.match(regProcedure)) {
                return i;
            }
        }
    }

    private getNextSymbolRange(document: vscode.TextDocument,line: number): vscode.Range | undefined {
        const regParagraph = new RegExp("^.{6} (\\w[^ ]*\\.$)|(.* section\\.$)","igm");
        let i: number;
        let range;
        for (i = line + 1;i < document.lineCount;i++) {
            range = document.getWordRangeAtPosition(new vscode.Position(i,0),regParagraph);
            if (range) {
                return range;
            }
        }
    }
}