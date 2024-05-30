import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let supportedExtensions = ['sqlx'];

const shell = (cmd: string) => execSync(cmd, { encoding: 'utf8' });

export function executableIsAvailable(name: string) {
    try { shell(`which ${name}`); return true; }
    catch (error) {
        vscode.window.showErrorMessage((error as Error).message);
        return false;
    }
}

export function getFileNameFromDocument(document: vscode.TextDocument): string {
    var filename = document.uri.fsPath;
    let basenameSplit = path.basename(filename).split('.');
    let extension = basenameSplit[1];
    let validFileType = supportedExtensions.includes(extension);
    if (!validFileType) {
        vscode.window.showWarningMessage(`dataform-lsp-vscode extension currently only supports ${supportedExtensions} files`);
        return "";
    }
    filename = basenameSplit[0];
    return filename;
}

export function isDataformWorkspace(workspacePath: string) {
    const dataformSignatureFiles = ['workflow_settings.yaml', 'dataform.json'];
    let fileExists = false;

    for (let i = 0; dataformSignatureFiles.length; i++) {
        const filePath = path.join(workspacePath, dataformSignatureFiles[i]);
        let fileExists = fs.existsSync(filePath);
        if (fileExists) {
            return fileExists;
        }
    }
    return fileExists;
}




// Get start and end line number of the config block in the .sqlx file
// This assumes that the user is using config { } block at the top of the .sqlx file
//
// @return [start_of_config_block: number, end_of_config_block: number]
export const getLineNumberWhereConfigBlockTerminates = (): [number, number] => {
    let startOfConfigBlock = 0;
    let endOfConfigBlock = 0;
    let isInInnerConfigBlock = false;
    let innerConfigBlockCount = 0;

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return [0, 0];
    }

    const document = editor.document;
    const totalLines = document.lineCount;

    for (let i = 0; i < totalLines; i++) {
        const lineContents = document.lineAt(i).text;

        if (lineContents.match("config")) {
            startOfConfigBlock = i + 1;
        } else if (lineContents.match("{")) {
            isInInnerConfigBlock = true;
            innerConfigBlockCount += 1;
        } else if (lineContents.match("}") && isInInnerConfigBlock && innerConfigBlockCount >= 1) {
            innerConfigBlockCount -= 1;
        } else if (lineContents.match("}") && innerConfigBlockCount === 0) {
            endOfConfigBlock = i + 1;
            return [startOfConfigBlock, endOfConfigBlock];
        }
    }

    return [0, 0];
};

export function isNotUndefined(value: unknown): any {
    if (typeof value === undefined) { throw new Error("Not a string"); }
}


export async function writeCompiledSqlToFile(compiledQuery: string, filePath: string) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '', 'utf8');
    }

    // Write the compiled output to the file
    fs.writeFileSync(filePath, compiledQuery, 'utf8');

    // Open the output file in a vertical split
    const outputDocument = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(outputDocument, { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true });
}

export function getStdoutFromCliRun(exec: any, cmd: string): Promise<any> {
    return new Promise((resolve, reject) => {
        console.log(`cmd: ${cmd}`);

        exec(cmd, (err: any, stdout: any, stderr: any) => {
            if (err) {
                vscode.window.showErrorMessage(`Error sourcesProcess: ${err}`);
                reject(err);
                return;
            }
            if (stderr) {
                vscode.window.showErrorMessage(`Error sourcesProcess: ${stderr}`);
                reject(new Error(stderr));
                return;
            }

            try {
                const output = stdout.toString();
                resolve(output);
            } catch (parseError) {
                reject(parseError);
            }
        });
    });
}

