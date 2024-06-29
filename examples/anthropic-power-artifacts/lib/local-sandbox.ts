import * as fs from 'fs/promises';
import { exec } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pythonContainer = process.env.PYTHON_DOCKER_IMAGE;

interface RunResult {
    png: string
}

interface CodeExecResult {
    logs: {
        stdout: string[]
        stderr: string[]
    }
    error?: any
    results: RunResult[]
}



function preprocessPythonCode(prefix:string, code: string): string {
    let showCount = 0;
    const lines = code.split('\n');
    const processedLines = lines.map(line => {
        if (line.trim().startsWith('plt.show()')) {
            showCount++;
            return line.replace('plt.show()', `plt.savefig('/app/${prefix}_figure_${showCount}.png')`);
        }
        return line;
    });
    return processedLines.join('\n');
}

export async function runJs(userID: string, code: string) {
    const result ={
      logs:{stdout:[],stderr:[]},
      error:undefined,
      results:[{html:code}]
    }
    return result
  }
  

export async function runPython(userID: string,code: string): Promise<CodeExecResult> {
    //create random  prefix name for temp_script.py
    const tempPrefix = Math.random().toString(36).substring(7);

    const tempFilePath = path.join(__dirname, `${tempPrefix}_temp_script.py`);
    const processedCode = preprocessPythonCode(tempPrefix,code);
    console.log(processedCode);
    const generatedFiles: string[] = [];
    let stdErrStr: string = '';
    let stdOutStr: string = '';
    try {
        // 写入处理后的 Python 代码到临时文件
        await fs.writeFile(tempFilePath, processedCode);

        // 构建 Docker 命令
        const dockerCommand = `docker run --rm -v "${__dirname}:/app" ${pythonContainer} python /app/${tempPrefix}_temp_script.py`;

        // 执行 Docker 命令
        const result = await new Promise<string>((resolve, reject) => {
            exec(dockerCommand, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                if (stderr) {
                    console.error('Docker stderr:', stderr);
                }
                resolve(stdout);
            });
        });

        // 检查生成的图片文件，转换为 base64，然后删除
        for (let i = 1; ; i++) {
            const imagePath = path.join(__dirname, `${tempPrefix}_figure_${i}.png`);
            const imageExists = await fs.access(imagePath).then(() => true).catch(() => false);
            if (imageExists) {
                const imageBuffer = await fs.readFile(imagePath);
                const base64Image = imageBuffer.toString('base64');
                generatedFiles.push(`${base64Image}`);
                // 删除临时图片文件
                await fs.unlink(imagePath);
            } else {
                break;
            }
        }
        stdOutStr = result.trim();
        console.log('Python execution result:', stdOutStr);
        generatedFiles.forEach(file => {
            console.log(`${file.substring(0, 50)}...`);
          });
    } catch (error) {
        console.error('Error:', error);
        stdErrStr = JSON.stringify(error);
        throw error;
    } finally {
        // 清理临时文件
        try {
            await fs.unlink(tempFilePath);
        } catch (error) {
            console.error('Error deleting temp file:', error);
        }
        return {
            logs:{
                stdout: [stdOutStr],
                stderr: [stdErrStr]
            },
            results: generatedFiles.map(data => ({ 'png': data }))
        };
    };
}
