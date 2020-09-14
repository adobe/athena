const k8s = require('@kubernetes/client-node');

class KubernetesManager {
  constructor(config) {
    this.athenaConfig = config;
    this.kubeConfig = new k8s.KubeConfig();
    this.kubeConfig.loadFromDefault();
    this.AppsV1Api = this.kubeConfig.makeApiClient(k8s.AppsV1Api);
    this.BatchV1Api = this.kubeConfig.makeApiClient(k8s.BatchV1Api);
    this.CoreV1Api = this.kubeConfig.makeApiClient(k8s.CoreV1Api)
  }

  // Spawns {count} shortlived Athena agent(s).
  spawnShortlivedAgents = async (deploymentConfig = null, count = 1, namespace = 'athena-cluster') => {
    if (!deploymentConfig) {
      throw new Error('The shortlived Athena agents deployment config is required!');
    }

    try {
      await this.BatchV1Api.createNamespacedJob(namespace, deploymentConfig, true)
      console.log(`Successfully deployed ${count} shortlived Athena agents!`)
    } catch (e) {
      console.error(`Error while deploying ${count} Kubernetes shortlived Athena agents!\n${JSON.stringify(err)}`);
    }
  }

  pruneShortlivedAgents = async (jobId) => {
    console.log(`Preparing to prune Athena agents: job_id=${jobId}`)

    // Delete the job.
    const jobLabel = `athena-ni-agent-${jobId}`;
    await this.BatchV1Api.deleteNamespacedJob(jobLabel, "athena-cluster");

    // Delete the pod.
    await this
      .CoreV1Api
      .deleteCollectionNamespacedPod(
        "athena-cluster",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        `job-name=${jobLabel}`
      )
  }

  getJobsByLabels = async (labels) => {
    return await this.BatchV1Api.listNamespacedJob("athena-cluster", undefined, undefined, undefined, undefined, labels);
  }

  listClusterNodes = async () => {
    return await this.CoreV1Api.listNode();
  }

  listClusterPods = async () => {
    return await this.CoreV1Api.listPodForAllNamespaces();
  }
}

module.exports = KubernetesManager;