import * as vscode from 'vscode';

export default class CobolDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

    public provideDocumentSymbols(document: vscode.TextDocument,token: vscode.CancellationToken): vscode.DocumentSymbol[]{
        let symbolDivision = this.getDivisionRange(document);

        if (symbolDivision){
            let range1: vscode.Range | undefined;
            let range2: vscode.Range | undefined;
            const regParagraph = new RegExp("^.{6} (\\w[^ ]*\\.$|.* SECTION\\.$)","igm");

            for (let symbol of symbolDivision){
                if (symbol.name.includes("IDENTIFICATION")){ //I don't need this info
                    continue;
                }

                let symbolParagraph: vscode.DocumentSymbol[] = [];

                range1 = this.getNextSymbolRange(document,symbol.range.start.line,symbol.range.end.line,regParagraph);
                while (range1) {    //get symbols of paragraphs
                    range2 = this.getNextSymbolRange(document,range1.start.line,symbol.range.end.line,regParagraph);
                    if (range2) {
                        symbolParagraph.push(
                            new vscode.DocumentSymbol(
                                document.getText(range1).substring(7),
                                "",
                                document.getText(range1).includes(" SECTION") ? 4:5,
                                new vscode.Range(range1.start,range2.start),
                                range1
                            )
                        );
                    } else {
                        symbolParagraph.push(
                            new vscode.DocumentSymbol(
                                document.getText(range1).substring(7),
                                "",
                                document.getText(range1).includes(" SECTION") ? 4:5,
                                new vscode.Range(range1.start,new vscode.Position(symbol.range.end.line,0)),
                                range1
                            )
                        );
                    }
        
                    range1 = range2;
                }

                symbol.children = symbolParagraph;
            }
        }

        return symbolDivision;
    }

    private getDivisionRange(document: vscode.TextDocument): vscode.DocumentSymbol[] {
        const regDivistion = new RegExp("^.{6} .* +(DIVISION)","i");
        const regProcedureDivistion = new RegExp("^.{6} +PROCEDURE DIVISION","i");
        let symbol:vscode.DocumentSymbol[] = [];
        let range1: vscode.Range | undefined;
        let range2: vscode.Range | undefined;

        range1 = this.getNextSymbolRange(document,0,document.lineCount,regDivistion);
        while(range1){
            if (document.lineAt(range1.start.line).text.match(regProcedureDivistion)) {
                symbol.push(new vscode.DocumentSymbol(
                    document.getText(range1).substring(7),
                    "",
                    3,
                    new vscode.Range(range1.start, new vscode.Position(document.lineCount - 1,0)),
                    range1
                ));

                break;
            }

            range2 = this.getNextSymbolRange(document,range1.start.line,document.lineCount,regDivistion);
            if (range2){
                symbol.push(new vscode.DocumentSymbol(
                    document.getText(range1).substring(7),
                    "",
                    3,
                    new vscode.Range(range1.start,range2.start),
                    range1
                ));
            } else {
                symbol.push(new vscode.DocumentSymbol(
                    document.getText(range1).substring(7),
                    "",
                    3,
                    new vscode.Range(range1.start,new vscode.Position(document.lineCount - 1,0)),
                    range1
                ));
            }

            range1 = range2;
        }
        return symbol;
    }

    private getNextSymbolRange(document: vscode.TextDocument,startLine: number,endLine: number, regex: RegExp): vscode.Range | undefined {
        let range;
        for (let i = startLine + 1; i <= endLine; i++) {
            range = document.getWordRangeAtPosition(new vscode.Position(i,0),regex);
            if (range) {
                return range;
            }
        }
    }
}