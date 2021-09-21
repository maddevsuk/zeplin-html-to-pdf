const { spawn } = require("child_process");

module.exports = function (html, options = []) {
    return new Promise(((resolve, reject) => {
        const bufs = [];
        const proc = spawn("/bin/sh", ["-o", "pipefail", "-c", `lib/wkhtmltopdf ${options.join(" ")} - - | cat`]);

        proc.on("error", error => {
            reject(error);
        }).on("exit", code => {
            if (code) {
				/*
					https://github.com/wkhtmltopdf/wkhtmltopdf/issues/1502#issuecomment-35705833
					
					0	All OK
					1	PDF generated OK, but some request(s) did not return HTTP 200
					2	Could not something something
					X	Could not write PDF: File in use
					Y	Could not write PDF: No write permission
					Z	PDF generated OK, but some JavaScript requests(s) timeouted
					A	Invalid arguments provided
					B	Could not find input file(s)
					C	Process timeout
				*/
				
				if (code === 1 || code === "Z") {
					resolve(Buffer.concat(bufs));
				}
				else {
					reject(new Error(`wkhtmltopdf process exited with code ${code}`));
				}
            } else {
                resolve(Buffer.concat(bufs));
            }
        });

        proc.stdin.end(html);

        proc.stdout.on("data", data => {
            bufs.push(data);
        }).on("error", error => {
            reject(error);
        });
    }));
};