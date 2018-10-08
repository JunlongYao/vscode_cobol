import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export default class CobolDefinitionProvider implements vscode.DefinitionProvider {
    public async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Location[]> {
        let location:vscode.Location[] = [];
        let loc;

        if (document.lineAt(position.line).text.match("^.{6} .*(PERFORM|THRU|GO TO)")){
            loc = this.getParaLocation(document,position);
            if (loc){
                location.push(loc);
            }
            return location;
        }

        loc = this.findVarInLocal(document,position);

        if (loc){   //find in local file, then not in copybook
            location.push(loc);
        } else {    //not find in local file, then try to find in copybook
            location = await this.getCopybookLocation(document,position);
        }

        return location;

    }

    private getParaLocation(document: vscode.TextDocument, position: vscode.Position): vscode.Location | undefined {
        let wordRange = document.getWordRangeAtPosition(position,new RegExp('[a-zA-Z0-9_\\-]+'));
        let word = wordRange ? document.getText(wordRange) : '';
        if (word === ""){
            return undefined;
        }

        let lineText: String;
        for (let i = 1; i < document.lineCount; i++){
            lineText = document.lineAt(i).text;
            if (lineText.match("^.{6} " + word + "[\\.$| +SECTION.$]")){
                return new vscode.Location(
                    document.uri,
                    new vscode.Position(i,7)
                );
            }
        }
        return undefined;
    }

    private findVarInLocal(document: vscode.TextDocument,position: vscode.Position): vscode.Location | undefined {
        let i = 0;
        let wordRange = document.getWordRangeAtPosition(position,new RegExp('[a-zA-Z0-9_\\-]+'));
        let word = wordRange ? document.getText(wordRange) : '';
        let regProcedure = new RegExp("^.{6} +PROCEDURE DIVISION.*","i");
        if ( word === ''){
            return undefined;
        }

        let lineText: String;
        let varReg = new RegExp("^.{6} .* " + word + ".*");
        for (i = 1; i < document.lineCount; i++){
            lineText = document.lineAt(i).text;
            if (lineText.match(varReg)){
                return new vscode.Location (
                    document.uri,
                    new vscode.Position(i,lineText.search(word))
                );
            } else if (lineText.match(regProcedure)){
                return undefined;
            }
        }
    }

    private async getCopybookLocation(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Location[]> {
        let location: vscode.Location[] = [];

        let copybooks = this.getCopybooks(document);

        // TODO: HOW TO GET LANGUAGE CONFIGUATION
        let wordRange = document.getWordRangeAtPosition(position,new RegExp('[a-zA-Z0-9_\\-]+'));
        let word = wordRange ? document.getText(wordRange) : '';
        let wordPrefix = word.slice(0,word.indexOf("-"));
        let wordSuffix = word.slice(word.indexOf("-"));

        let copybookFilter = copybooks.filter(item => {
            if (item[0].startsWith(wordPrefix)) {
                return item;
            }
        });

        let filePath = path.dirname(document.fileName);

        let name: string;
        let folder: string;
        let fullPath: string;

        for (let element of copybookFilter){
            name = element[0];
            folder = element[1];
            fullPath = filePath + path.sep + folder + path.sep + name;
            if (fs.existsSync(fullPath)){
                let uri = vscode.Uri.file(fullPath);
                let copybookLocation = await this.findVarInCopybook(uri,wordSuffix);
                if (copybookLocation){
                    location.push(copybookLocation);
                }
            }
        }

        return location;
    }

    private getCopybooks(document: vscode.TextDocument): [string,string][] {
        // const regCopy = new RegExp("^.{6} .*(COPY .*\\.$)","igm");
        const regCopy = new RegExp("^.{6} .*(COPY.*)","igm");
        let copybookLines = document.getText().match(regCopy);
        let copybooks: [string,string][] = [];
        if (copybookLines) {
            copybookLines.forEach(element => {
                let elementSplict = element.split(new RegExp(" +"));
                let copybookNameIndex = elementSplict.findIndex(element => {return element === "COPY";}) + 1;
                let copybookFolderIndex = elementSplict.findIndex(element => {return element === "IN";}) + 1;
                if (copybookNameIndex > 1 && copybookFolderIndex > 1){
                    copybooks.push([elementSplict[copybookNameIndex], elementSplict[copybookFolderIndex].replace(".","")]);
                }
            });
        }

        return copybooks.sort();
    }

    private async findVarInCopybook(uri: vscode.Uri, wordSuffix: string): Promise<vscode.Location | undefined> {
        let document = await vscode.workspace.openTextDocument(uri);

        let line = 0;
        let lineText;
        for(line = 1; line < document.lineCount; line++) {
            lineText = document.lineAt(line).text;
            if (lineText.match(new RegExp("^.{6} .*" + wordSuffix + ".*"))) {
                return new vscode.Location(
                    uri,
                    new vscode.Position(line,lineText.search(wordSuffix))
                );
            }
        }
    }
}