process.env.PATH = `${process.env.PATH}:${process.env.LAMBDA_TASK_ROOT}`;
const wkhtmltopdf = require("./utils/wkhtmltopdf");
const errorUtil = require("./utils/error");
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = function handler(event, context, callback) {
    
    if(!event.s3HtmlContentUrl && !event.html){
        const errorResponse = errorUtil.createErrorResponse(400, "Validation error: at least one argument must be provided:'html' as payload or 's3HtmlContentUrl'");
        callback(errorResponse);
        return;
    }

    if(!event.s3HtmlContentUrl || event.s3HtmlContentUrl === ""){
        if (!event.html) {
            const errorResponse = errorUtil.createErrorResponse(400, "Validation error: Missing field 'html'.");
            callback(errorResponse);
            return;
        }

        convert(event, callback);
        return;
    }

    let firstSlashIndex = event.s3HtmlContentUrl.indexOf('/');
    let bucket = event.s3HtmlContentUrl.substring(0, firstSlashIndex);
    let fullKeyPath = event.s3HtmlContentUrl.substring(firstSlashIndex + 1);

    const params = {
        Bucket: bucket,
        Key: fullKeyPath
    };
    
    s3.getObject(params, function(err, data) {
        if (err) {
            const errorResponse = errorUtil.createErrorResponse(err.statusCode, err);
            callback(errorResponse);
            return;
        } 
        else {
            const htmlDocument = data.Body.toString('utf-8');
            if(htmlDocument && htmlDocument.length > 0)
            {
            
                event.html = htmlDocument;
    
                convert(event, callback);
            }
            else{
                const errorResponse = errorUtil.createErrorResponse(404, "file not found in tenant staging area.");
                callback(errorResponse);
                return;
            }
        }
        });
	
    function convert(event, callback){
        const optns = event.options || [];

        wkhtmltopdf(event.html, optns)
            .then(buffer => {
                callback(null, {
                    data: buffer.toString("base64")
                });
            })
            .catch(error => {
                callback(errorUtil.createErrorResponse(500, "Internal server error", error));
            });
    }
};