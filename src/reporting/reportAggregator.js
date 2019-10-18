const {mean, min, max, sum} = require("lodash")


class ReportAggregator {
    constructor() {
        this.aggregationMethods = [
            {
                method: "keepUnique",
                metrics: [
                    "title",
                    "url",
                    "socketPath",
                    "pipelining"
                ]
            },
            {
                method: "minDate",
                metrics: ["start"]
            },
            {
                method: "maxDate",
                metrics: ["finish"]
            },
            {
                method:  "sum",
                metrics: [
                    "average",
                    "mean",
                    "sent",
                    "total",
                    "errors",
                    "timeouts",
                    "non2xx",
                    "1xx",
                    "2xx",
                    "3xx",
                    "4xx",
                    "5xx"
                ]
            },
            {
                method: "min",
                metrics: ["min"]
            },
            {
                method: "max",
                metrics: ["max"]
            },
            {
                method: "mean",
                metrics: [
                    "connections",
                    "duration"
                ]
            },
            {
                method: "weightedMean",
                metrics: [
                    "p0_001",   // percentile aggregation is unstable statistically
                    "p0_01",    // and should only be considered as rough approximation
                    "p0_1",
                    "p1",
                    "p2_5",
                    "p10",
                    "p25",
                    "p50",
                    "p75",
                    "p90",
                    "p97_5",
                    "p99",
                    "p99_9",
                    "p99_99",
                    "p99_999"
                ]
            }
        ]
    }

    mapByPropertyPath = (objList, propertyPath, method) => {
        let values = [];
        objList.forEach(obj => {
            propertyPath.map(property => obj = obj[property]);
            values.push(obj);
        });
        return method(values);
    }

    getAggregatorMethod = (metric) => {
        for (let aggregatingMethod of this.aggregationMethods) {
            if (aggregatingMethod.metrics.includes(metric)) {
                return this[aggregatingMethod.method];
            }
        }
    }

    keepUnique = (sameElementList) => sameElementList[0];

    min = (numbers) => min(numbers.map(x => parseFloat(x)));

    max = (numbers) => max(numbers.map(x => parseFloat(x)));
    
    sum = (numbers) => sum(numbers.map(x => parseFloat(x)));
    
    mean = (numbers) => mean(numbers.map(x => parseFloat(x)));

    weightedMean  = (valueList) => {
        // weighted mean given possibly uneven groups
        const weightedSum = valueList.map((x, i) => x * this.totalRequestsPerGroup[i]);
        return this.sum(weightedSum) / this.totalRequests;
    }

    grandStandardDeviation = (metricList) => {
        // total standard deviation given possibly uneven groups
        const grandMean = this.weightedMean(metricList.map(x => x.mean));
        const sumsOfSquares = metricList.map((x, i) => (grandMean - x.mean) ** 2 * this.totalRequestsPerGroup[i]);
        const totalGroupSumOfSquares = this.sum(sumsOfSquares);
        const variances = metricList.map((x, i) => x.stddev ** 2 * (this.totalRequestsPerGroup[i] - 1));
        const errorSumOfSquares = this.sum(variances);
        return Math.sqrt((totalGroupSumOfSquares + errorSumOfSquares) / (this.totalRequests - 1));
    }

    minDate = (dateList) => {
        const dateObjectList = dateList.map(x => Date(x));
        return String(min(dateObjectList));
    }

    maxDate = (dateList) => {
        const dateObjectList = dateList.map(x => Date(x));
        return String(max(dateObjectList));
    }

    buildReport = (reportList) => {
        this.totalRequestsPerGroup = reportList.map(x => x.requests.sent);
        this.totalRequests = this.sum(this.totalRequestsPerGroup);
        
        let completeReport = {};
        let reportTemplate = reportList[0];
        
        for (let metric in reportTemplate) {
            if (typeof reportTemplate[metric] == 'object') {
                completeReport[metric]  = {};
                if ("stddev" in reportTemplate[metric]) {
                    let metricList = reportList.map(x => x[metric]);
                    completeReport[metric].stddev = this.grandStandardDeviation(metricList);
                    delete reportTemplate[metric].stddev;
                }
                for (let submetric in reportTemplate[metric]) {
                    let method = this.getAggregatorMethod(submetric);
                    completeReport[metric][submetric] = this.mapByPropertyPath(reportList, [metric, submetric], method);
                }
            } else {
                let method = this.getAggregatorMethod(metric);
                completeReport[metric] = this.mapByPropertyPath(reportList, [metric], method);
            }
        }
        return completeReport;
    }
}
