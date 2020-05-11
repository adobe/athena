// const MongoDB = require('./../storage/clients').mongo;
const Models = require('./models');

class StorageRepository {

    // Projects
    createProject = ({name, description, repoUrl}) => {
        return new Promise((resolve, reject) => {
            const Project = new Models.Project({ name, description, repoUrl });
            Project.save(function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            })
         });
    }

    readAllProjects = () => {
        return new Promise((resolve, reject) => {
            Models.Project.find({}, function(err, projects) {
                if (err) {
                    reject(err);
                } else {
                    resolve(projects);
                }
            });
         });
    }

    readSingleProject = (id) => {
        return new Promise((resolve, reject) => {
            Models.Project.findOne({ _id: id }, function(err, project) {
                if (err) {
                    reject(err);
                } else {
                    resolve(project);
                }
            });
         });
    }

    storeSinglePerfTest = ({ projectId, testData }) => {
        return new Promise((resolve, reject) => {
            const PerformanceTest = new Models.PerformanceTest({
                projectId,
                config: testData
            });
            
            PerformanceTest.save(function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            })
         });
    }

    storeSinglePerfRun = (tid, tc) => {
        return new Promise((resolve, reject) => {
            const PerformanceTestRun = new Models.PerformanceTestRun({
                testId: tid,
                config: tc,
                status: "PENDING",
                reports: 0,
                reportUrl: ""
            });
            
            PerformanceTestRun.save(function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(PerformanceTestRun);
                }
            })
        });
    }

    readAllPerfTests  = (projectId) => {
        return new Promise((resolve, reject) => {
            Models.PerformanceTest.find({ projectId }, null, {sort: {createdAt: -1}}, function(err, perfTests) {
                if (err) {
                    reject(err);
                } else {
                    resolve(perfTests);
                }
            });
         });   
    }

    readSinglePerfTest = (testId) => {
        return new Promise((resolve, reject) => {
            Models.PerformanceTest
                .findOne({ _id: testId })
                .populate("perfRuns")   
                .exec(function(err, perfTest) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(perfTest);
                    }
                })
         });
    }

    readAllPerfRuns  = (testId) => {
        return new Promise((resolve, reject) => {
            Models.PerformanceTestRun.find({ testId }, null, {sort: {createdAt: -1}}, function(err, perfRuns) {
                if (err) {
                    reject(err);
                } else {
                    resolve(perfRuns);
                }
            });
         });   
    }

    findPerfRunById = (id) => {
        return new Promise((resolve, reject) => {
            Models.PerformanceTestRun.findOne({ _id: id }, function(err, perfRun) {
                if (err) {
                    reject(err);
                } else {
                    resolve(perfRun);
                }
            });
         });   
    }

    incrPerfRunReports = (id) => {
        return new Promise((resolve, reject) => {
            Models.PerformanceTestRun.findOneAndUpdate({ _id: id }, { $inc: { reports: 1 } }, { new: true }, function(err, perfRun) {
                if (err) {
                    reject(err);
                } else {
                    resolve(perfRun);
                }
            });
         });   
    }

    updatePerfTestById = (id, updatedData) => {
        return new Promise((resolve, reject) => {
            Models.PerformanceTest.findOneAndUpdate({ _id: id }, updatedData, { new: true }, function(err, perfTest) {
                if (err) {
                    reject(err);
                } else {
                    resolve(perfTest);
                }
            });
         });     
    }

    // TODO! Delete ES records as well.
    deletePerformanceTestById = (testId) => {
        return new Promise((resolve, reject) => {
            Models.PerformanceTest.deleteOne({ _id: testId }, function(err) {
                if (err) {
                    reject(err);
                } else {
                    Models.PerformanceTestRun.deleteMany({ testId: testId }, function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                }
            });
         });   
    }

    // TODO! Delete ES records as well.
    deleteProjectById = (projectId) => {
        return new Promise((resolve, reject) => {
            Models.Project.deleteOne({ _id: projectId }, function(err) {
                if (err) {
                    reject(err);
                } else {
                    Models.PerformanceTest.find({ projectId }, null, {sort: {createdAt: -1}}, function(err, perfTests) {
                        if (err) {
                            reject(err);
                        } else {
                            const ptIdsToDelete = perfTests.map(p => { return p._id });
                            Models.PerformanceTestRun.deleteMany({ testId: ptIdsToDelete }, function(err) {
                                if (err) {
                                    reject(err);
                                } else {
                                    Models.PerformanceTest.deleteMany({ projectId }, function(err) {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve();
                                        }
                                    })
                                }
                            })
                        }
                    });
                }
            });
         });   
    }
}

module.exports = new StorageRepository();