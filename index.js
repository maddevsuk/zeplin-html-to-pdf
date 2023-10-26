process.env.PATH = `${process.env.PATH}:${process.env.LAMBDA_TASK_ROOT}`;
const wkhtmltopdf = require("./utils/wkhtmltopdf");
const errorUtil = require("./utils/error");
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = function handler(event, context, callback) {
    if(!event.s3Params){
        callback(errorUtil.createErrorResponse(400, "Validation error: Missing field 's3Params'"));
    }
    
    s3.getObject(event.s3Params, function(err, data) {
        if (err) {
            callback(errorUtil.createErrorResponse(err.statusCode, err));
        } 
        else {
            const htmlDocument = data.Body.toString('utf-8');
            if(htmlDocument && htmlDocument.length > 0)
            {
                event.html = htmlDocument;
                convert(event, callback);
            }
            else{
                callback(errorUtil.createErrorResponse(404, "file not found in tenant staging area."));
            }
        }
        });
	
    function convert(event, callback){
        wkhtmltopdf(event.html)
            .then(buffer => {
                s3.upload({
                    Bucket: event.s3Params.Bucket,
                    ContentType: 'application/pdf',
                    ContentDisposition: 'inline',
                    Key: `${event.s3Params.Key}-converted`,
                    Body: buffer
                }).promise()
                    .then(res => {
                        callback(null, {
                            data: res
                        });
                    }
                )
                .catch(error => {
                    callback(errorUtil.createErrorResponse(500, "Internal server error uploading pdf to s3", error));    
                })
            })
            .catch(error => {
                callback(errorUtil.createErrorResponse(500, "Internal server error", error));
            });
    }
};