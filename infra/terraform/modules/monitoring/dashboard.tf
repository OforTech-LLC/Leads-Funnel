# =============================================================================
# CloudWatch Dashboard - Comprehensive Operations Dashboard
# =============================================================================
# This dashboard provides:
# - Overview row with key metrics
# - Lambda performance and errors
# - API Gateway metrics
# - DynamoDB capacity and throttles
# - SQS queue metrics (if enabled)
# - X-Ray tracing insights (if enabled)
# =============================================================================

resource "aws_cloudwatch_dashboard" "main" {
  count = var.create_dashboard ? 1 : 0

  dashboard_name = "${var.project_name}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = concat(
      # =======================================================================
      # Row 0: Overview - Key Metrics at a Glance
      # =======================================================================
      [
        {
          type   = "text"
          x      = 0
          y      = 0
          width  = 24
          height = 1
          properties = {
            markdown = "# ${var.project_name} - ${var.environment} Environment Dashboard\n**Region:** ${var.aws_region} | **Last Updated:** $${NOW}"
          }
        },
        # Request Count (Single Value)
        {
          type   = "metric"
          x      = 0
          y      = 1
          width  = 6
          height = 4
          properties = {
            title  = "API Requests (5m)"
            region = var.aws_region
            metrics = [
              ["AWS/ApiGateway", "Count", "ApiId", var.api_gateway_id, { stat = "Sum", period = 300, label = "Requests" }]
            ]
            view   = "singleValue"
            period = 300
          }
        },
        # Error Rate (Single Value with gauge)
        {
          type   = "metric"
          x      = 6
          y      = 1
          width  = 6
          height = 4
          properties = {
            title  = "API Error Rate"
            region = var.aws_region
            metrics = [
              [{ expression = "IF(m1 > 0, (m2 + m3) / m1 * 100, 0)", label = "Error Rate %", id = "e1" }],
              ["AWS/ApiGateway", "Count", "ApiId", var.api_gateway_id, { stat = "Sum", period = 300, id = "m1", visible = false }],
              ["AWS/ApiGateway", "4xx", "ApiId", var.api_gateway_id, { stat = "Sum", period = 300, id = "m2", visible = false }],
              ["AWS/ApiGateway", "5xx", "ApiId", var.api_gateway_id, { stat = "Sum", period = 300, id = "m3", visible = false }]
            ]
            view   = "singleValue"
            period = 300
          }
        },
        # Lambda Duration P50 (Single Value)
        {
          type   = "metric"
          x      = 12
          y      = 1
          width  = 6
          height = 4
          properties = {
            title  = "Lambda P50 Duration"
            region = var.aws_region
            metrics = [
              ["AWS/Lambda", "Duration", "FunctionName", var.lambda_function_name, { stat = "p50", period = 300, label = "P50 ms" }]
            ]
            view   = "singleValue"
            period = 300
          }
        },
        # Active Alarms
        {
          type   = "alarm"
          x      = 18
          y      = 1
          width  = 6
          height = 4
          properties = {
            title = "Alarm Status"
            alarms = [
              aws_cloudwatch_metric_alarm.lambda_errors.arn,
              aws_cloudwatch_metric_alarm.api_5xx.arn,
              aws_cloudwatch_metric_alarm.dynamodb_throttles.arn,
            ]
          }
        }
      ],

      # =======================================================================
      # Row 1: Lambda Metrics
      # =======================================================================
      [
        {
          type   = "text"
          x      = 0
          y      = 5
          width  = 24
          height = 1
          properties = {
            markdown = "## Lambda Function Metrics"
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 6
          width  = 8
          height = 6
          properties = {
            title  = "Lambda Invocations"
            region = var.aws_region
            metrics = [
              ["AWS/Lambda", "Invocations", "FunctionName", var.lambda_function_name, { stat = "Sum", period = 60, label = "Invocations" }]
            ]
            view    = "timeSeries"
            stacked = false
            period  = 60
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 6
          width  = 8
          height = 6
          properties = {
            title  = "Lambda Errors & Throttles"
            region = var.aws_region
            metrics = [
              ["AWS/Lambda", "Errors", "FunctionName", var.lambda_function_name, { stat = "Sum", period = 60, color = "#d62728", label = "Errors" }],
              ["AWS/Lambda", "Throttles", "FunctionName", var.lambda_function_name, { stat = "Sum", period = 60, color = "#ff7f0e", label = "Throttles" }]
            ]
            view    = "timeSeries"
            stacked = false
            period  = 60
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 6
          width  = 8
          height = 6
          properties = {
            title  = "Lambda Duration (Percentiles)"
            region = var.aws_region
            metrics = [
              ["AWS/Lambda", "Duration", "FunctionName", var.lambda_function_name, { stat = "p50", period = 60, label = "p50", color = "#2ca02c" }],
              ["AWS/Lambda", "Duration", "FunctionName", var.lambda_function_name, { stat = "p90", period = 60, label = "p90", color = "#ff7f0e" }],
              ["AWS/Lambda", "Duration", "FunctionName", var.lambda_function_name, { stat = "p99", period = 60, label = "p99", color = "#d62728" }]
            ]
            view    = "timeSeries"
            stacked = false
            period  = 60
            yAxis = {
              left = {
                label     = "Duration (ms)"
                showUnits = false
              }
            }
          }
        }
      ],

      # =======================================================================
      # Row 2: Lambda Advanced Metrics
      # =======================================================================
      [
        {
          type   = "metric"
          x      = 0
          y      = 12
          width  = 8
          height = 6
          properties = {
            title  = "Lambda Concurrent Executions"
            region = var.aws_region
            metrics = [
              ["AWS/Lambda", "ConcurrentExecutions", "FunctionName", var.lambda_function_name, { stat = "Maximum", period = 60, label = "Concurrent" }]
            ]
            view    = "timeSeries"
            stacked = false
            period  = 60
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 12
          width  = 8
          height = 6
          properties = {
            title  = "Lambda Error Rate (%)"
            region = var.aws_region
            metrics = [
              [{ expression = "IF(m1 > 0, m2 / m1 * 100, 0)", label = "Error Rate %", id = "e1" }],
              ["AWS/Lambda", "Invocations", "FunctionName", var.lambda_function_name, { stat = "Sum", period = 60, id = "m1", visible = false }],
              ["AWS/Lambda", "Errors", "FunctionName", var.lambda_function_name, { stat = "Sum", period = 60, id = "m2", visible = false }]
            ]
            view    = "timeSeries"
            stacked = false
            period  = 60
            yAxis = {
              left = {
                min       = 0
                max       = 10
                label     = "Error Rate %"
                showUnits = false
              }
            }
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 12
          width  = 8
          height = 6
          properties = {
            title  = "Lambda Iterator Age (if applicable)"
            region = var.aws_region
            metrics = [
              ["AWS/Lambda", "IteratorAge", "FunctionName", var.lambda_function_name, { stat = "Maximum", period = 60 }]
            ]
            view    = "timeSeries"
            stacked = false
            period  = 60
          }
        }
      ],

      # =======================================================================
      # Row 3: API Gateway Metrics
      # =======================================================================
      [
        {
          type   = "text"
          x      = 0
          y      = 18
          width  = 24
          height = 1
          properties = {
            markdown = "## API Gateway Metrics"
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 19
          width  = 8
          height = 6
          properties = {
            title  = "API Request Count"
            region = var.aws_region
            metrics = [
              ["AWS/ApiGateway", "Count", "ApiId", var.api_gateway_id, { stat = "Sum", period = 60, label = "Requests" }]
            ]
            view    = "timeSeries"
            stacked = false
            period  = 60
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 19
          width  = 8
          height = 6
          properties = {
            title  = "API Errors by Type"
            region = var.aws_region
            metrics = [
              ["AWS/ApiGateway", "4xx", "ApiId", var.api_gateway_id, { stat = "Sum", period = 60, color = "#ff7f0e", label = "4xx Errors" }],
              ["AWS/ApiGateway", "5xx", "ApiId", var.api_gateway_id, { stat = "Sum", period = 60, color = "#d62728", label = "5xx Errors" }]
            ]
            view    = "timeSeries"
            stacked = true
            period  = 60
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 19
          width  = 8
          height = 6
          properties = {
            title  = "API Latency (Percentiles)"
            region = var.aws_region
            metrics = [
              ["AWS/ApiGateway", "Latency", "ApiId", var.api_gateway_id, { stat = "p50", period = 60, label = "p50", color = "#2ca02c" }],
              ["AWS/ApiGateway", "Latency", "ApiId", var.api_gateway_id, { stat = "p90", period = 60, label = "p90", color = "#ff7f0e" }],
              ["AWS/ApiGateway", "Latency", "ApiId", var.api_gateway_id, { stat = "p99", period = 60, label = "p99", color = "#d62728" }]
            ]
            view    = "timeSeries"
            stacked = false
            period  = 60
            yAxis = {
              left = {
                label     = "Latency (ms)"
                showUnits = false
              }
            }
          }
        }
      ],

      # =======================================================================
      # Row 4: API Gateway Advanced
      # =======================================================================
      [
        {
          type   = "metric"
          x      = 0
          y      = 25
          width  = 12
          height = 6
          properties = {
            title  = "API Integration Latency vs Total Latency"
            region = var.aws_region
            metrics = [
              ["AWS/ApiGateway", "IntegrationLatency", "ApiId", var.api_gateway_id, { stat = "Average", period = 60, label = "Integration (Lambda)", color = "#1f77b4" }],
              ["AWS/ApiGateway", "Latency", "ApiId", var.api_gateway_id, { stat = "Average", period = 60, label = "Total Latency", color = "#ff7f0e" }]
            ]
            view    = "timeSeries"
            stacked = false
            period  = 60
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 25
          width  = 12
          height = 6
          properties = {
            title  = "API Data Transfer"
            region = var.aws_region
            metrics = [
              ["AWS/ApiGateway", "DataProcessed", "ApiId", var.api_gateway_id, { stat = "Sum", period = 60, label = "Bytes Processed" }]
            ]
            view    = "timeSeries"
            stacked = false
            period  = 60
          }
        }
      ],

      # =======================================================================
      # Row 5: DynamoDB Metrics
      # =======================================================================
      [
        {
          type   = "text"
          x      = 0
          y      = 31
          width  = 24
          height = 1
          properties = {
            markdown = "## DynamoDB Metrics"
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 32
          width  = 8
          height = 6
          properties = {
            title  = "DynamoDB Consumed Capacity"
            region = var.aws_region
            metrics = [
              ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", var.dynamodb_table_name, { stat = "Sum", period = 60, label = "Read CU", color = "#1f77b4" }],
              ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", var.dynamodb_table_name, { stat = "Sum", period = 60, label = "Write CU", color = "#ff7f0e" }]
            ]
            view    = "timeSeries"
            stacked = false
            period  = 60
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 32
          width  = 8
          height = 6
          properties = {
            title  = "DynamoDB Throttles & Errors"
            region = var.aws_region
            metrics = [
              ["AWS/DynamoDB", "ThrottledRequests", "TableName", var.dynamodb_table_name, { stat = "Sum", period = 60, color = "#ff7f0e", label = "Throttled" }],
              ["AWS/DynamoDB", "SystemErrors", "TableName", var.dynamodb_table_name, { stat = "Sum", period = 60, color = "#d62728", label = "System Errors" }],
              ["AWS/DynamoDB", "UserErrors", "TableName", var.dynamodb_table_name, { stat = "Sum", period = 60, color = "#9467bd", label = "User Errors" }]
            ]
            view    = "timeSeries"
            stacked = false
            period  = 60
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 32
          width  = 8
          height = 6
          properties = {
            title  = "DynamoDB Latency"
            region = var.aws_region
            metrics = [
              ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", var.dynamodb_table_name, "Operation", "GetItem", { stat = "Average", period = 60, label = "GetItem" }],
              ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", var.dynamodb_table_name, "Operation", "PutItem", { stat = "Average", period = 60, label = "PutItem" }],
              ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", var.dynamodb_table_name, "Operation", "Query", { stat = "Average", period = 60, label = "Query" }]
            ]
            view    = "timeSeries"
            stacked = false
            period  = 60
          }
        }
      ],

      # =======================================================================
      # Row 6: SQS Metrics (conditional)
      # =======================================================================
      # SQS header
      var.sqs_queue_name != "" ? [{
        type   = "text"
        x      = 0
        y      = 38
        width  = 24
        height = 1
        properties = {
          markdown = "## SQS Queue Metrics"
        }
      }] : [],
      # SQS Queue Depth
      var.sqs_queue_name != "" ? [{
        type   = "metric"
        x      = 0
        y      = 39
        width  = 8
        height = 6
        properties = {
          title  = "SQS Queue Depth"
          region = var.aws_region
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", var.sqs_queue_name, { stat = "Average", period = 60, label = "Visible" }],
            ["AWS/SQS", "ApproximateNumberOfMessagesNotVisible", "QueueName", var.sqs_queue_name, { stat = "Average", period = 60, label = "In Flight" }]
          ]
          view    = "timeSeries"
          stacked = true
          period  = 60
        }
      }] : [],
      # SQS Message Age
      var.sqs_queue_name != "" ? [{
        type   = "metric"
        x      = 8
        y      = 39
        width  = 8
        height = 6
        properties = {
          title  = "SQS Message Age"
          region = var.aws_region
          metrics = [
            ["AWS/SQS", "ApproximateAgeOfOldestMessage", "QueueName", var.sqs_queue_name, { stat = "Maximum", period = 60, label = "Oldest Message Age (s)" }]
          ]
          view    = "timeSeries"
          stacked = false
          period  = 60
        }
      }] : [],
      # SQS DLQ Messages
      var.sqs_dlq_name != "" ? [{
        type   = "metric"
        x      = 16
        y      = 39
        width  = 8
        height = 6
        properties = {
          title  = "SQS DLQ Messages"
          region = var.aws_region
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", var.sqs_dlq_name, { stat = "Sum", period = 60, color = "#d62728", label = "DLQ Messages" }]
          ]
          view    = "timeSeries"
          stacked = false
          period  = 60
        }
      }] : []
    )
  })
}
