const k8s = require('@kubernetes/client-node');

class KubernetesManager {
  constructor(config) {
    this.athenaConfig = config;
    this.kubeConfig = new k8s.KubeConfig();
    this
      .kubeConfig
      .loadFromDefault();
    this.AppsV1Api = this
      .kubeConfig
      .makeApiClient(k8s.AppsV1Api);
    this.BatchV1Api = this
      .kubeConfig
      .makeApiClient(k8s.BatchV1Api);
  }

  // Spawns {count} shortlived Athena agent(s).
  spawnShortlivedAgents = (deploymentConfig = null, count = 1, namespace = 'athena-cluster') => {
    // Check whether the deployment config is provided, otherwise throw.
    if (!deploymentConfig) {
      throw new Error('The shortlived Athena agents deployment config is required!');
    }

    this
      .BatchV1Api
      .createNamespacedJob(namespace, deploymentConfig, true)
      .then((res) => {
        console.log(`Successfully deployed ${count} shortlived Athena agents!`)
      }, (err) => {
        console.error(`Error while deploying ${count} Kubernetes shortlived Athena agents!\n${JSON.stringify(err)}`);
      });
  }

  getJobsByLabels = async(labels) => {
    return await this
      .BatchV1Api
      .listNamespacedJob("athena-cluster", undefined, undefined, undefined, undefined, labels);
  }
}

module.exports = KubernetesManager;