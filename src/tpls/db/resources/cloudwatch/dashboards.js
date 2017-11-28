const DashboardBody = JSON.stringify({
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 6,
      "height": 6,
      "properties": {
        "view": "timeSeries",
        "stacked": false,
        "metrics": [
          [ "AWS/RDS", "CPUUtilization", "Role", "WRITER", "DBClusterIdentifier", "${DBCluster}" ],
          [ "...", "READER", ".", "." ]
        ],
        "region": "${AWS::Region}",
        "title": "DB Writer CPUUtilization",
        "period": 300
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 0,
      "width": 6,
      "height": 6,
      "properties": {
        "view": "timeSeries",
        "stacked": false,
        "metrics": [
          [ "AWS/RDS", "Queries", "Role", "WRITER", "DBClusterIdentifier", "${DBCluster}" ],
          [ "...", "READER", ".", "." ]
        ],
        "region": "${AWS::Region}",
        "title": "DB Queries"
      }
    },
    {
      "type": "metric",
      "x": 6,
      "y": 0,
      "width": 6,
      "height": 6,
      "properties": {
        "view": "timeSeries",
        "stacked": false,
        "metrics": [
          [ "AWS/RDS", "FreeableMemory", "Role", "WRITER", "DBClusterIdentifier", "${DBCluster}" ],
          [ "...", "READER", ".", "." ]
        ],
        "region": "${AWS::Region}",
        "title": "DB FreeableMemory"
      }
    },
    {
      "type": "metric",
      "x": 18,
      "y": 0,
      "width": 6,
      "height": 6,
      "properties": {
        "view": "timeSeries",
        "stacked": false,
        "metrics": [
          [ "AWS/RDS", "Deadlocks", "Role", "WRITER", "DBClusterIdentifier", "${DBCluster}" ],
          [ "...", "READER", ".", "." ]
        ],
        "region": "${AWS::Region}",
        "title": "DB Deadlocks"
      }
    },
    {
      "type": "metric",
      "x": 0,
      "y": 6,
      "width": 6,
      "height": 6,
      "properties": {
        "view": "timeSeries",
        "stacked": false,
        "metrics": [
          [ "AWS/RDS", "FreeLocalStorage", "Role", "WRITER", "DBClusterIdentifier", "${DBCluster}" ],
          [ "...", "READER", ".", "." ]
        ],
        "region": "${AWS::Region}",
        "title": "DB FreeLocalStorage"
      }
    },
    {
      "type": "metric",
      "x": 6,
      "y": 6,
      "width": 6,
      "height": 6,
      "properties": {
        "view": "timeSeries",
        "stacked": false,
        "metrics": [
          [ "AWS/RDS", "UpdateThroughput", "Role", "WRITER", "DBClusterIdentifier", "${DBCluster}" ],
          [ ".", "InsertThroughput", ".", ".", ".", "." ],
          [ ".", "DeleteThroughput", ".", ".", ".", "." ]
        ],
        "region": "${AWS::Region}",
        "title": "DB Writer Write Throughput"
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 6,
      "width": 6,
      "height": 6,
      "properties": {
        "view": "timeSeries",
        "stacked": false,
        "metrics": [
          [ "AWS/RDS", "Queries", "Role", "WRITER", "DBClusterIdentifier", "${DBCluster}" ],
          [ "...", "READER", ".", "." ]
        ],
        "region": "${AWS::Region}",
        "title": "DB Queries"
      }
    },
    {
      "type": "metric",
      "x": 18,
      "y": 6,
      "width": 6,
      "height": 6,
      "properties": {
        "view": "timeSeries",
        "stacked": false,
        "metrics": [
          [ "AWS/RDS", "SelectThroughput", "Role", "WRITER", "DBClusterIdentifier", "${DBCluster}" ]
        ],
        "region": "${AWS::Region}",
        "title": "DB Writer Read Throughput"
      }
    },
    {
      "type": "metric",
      "x": 0,
      "y": 12,
      "width": 6,
      "height": 6,
      "properties": {
        "view": "timeSeries",
        "stacked": false,
        "metrics": [
          [ "AWS/RDS", "SelectThroughput", "Role", "READER", "DBClusterIdentifier", "${DBCluster}" ]
        ],
        "region": "${AWS::Region}",
        "title": "DB Reader Read Throughput"
      }
    },
    {
      "type": "metric",
      "x": 6,
      "y": 12,
      "width": 6,
      "height": 6,
      "properties": {
        "view": "timeSeries",
        "stacked": false,
        "metrics": [
          [ "AWS/RDS", "NetworkThroughput", "Role", "WRITER", "DBClusterIdentifier", "${DBCluster}" ],
          [ ".", "NetworkReceiveThroughput", ".", ".", ".", "." ],
          [ ".", "NetworkTransmitThroughput", ".", ".", ".", "." ]
        ],
        "region": "${AWS::Region}",
        "title": "DB Writer Network Throughput"
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 12,
      "width": 6,
      "height": 6,
      "properties": {
        "view": "timeSeries",
        "stacked": false,
        "metrics": [
          [ "AWS/RDS", "NetworkThroughput", "Role", "READER", "DBClusterIdentifier", "${DBCluster}" ],
          [ ".", "NetworkTransmitThroughput", ".", ".", ".", "." ],
          [ ".", "NetworkReceiveThroughput", ".", ".", ".", "." ]
        ],
        "region": "${AWS::Region}",
        "title": "DB Reader Network Throughput"
      }
    }
  ]
})

module.exports = {
  "Dashboards": {
    "Type": "AWS::CloudWatch::Dashboard",
    "Properties": {
      "DashboardName": { "Ref": "AWS::StackName" },
      DashboardBody: {
        "Fn::Sub": DashboardBody
      },
    }
  }
}