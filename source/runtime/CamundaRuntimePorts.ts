export class ContainerRuntimePorts {

  // Camunda
  public static CAMUNDA_COMMAND_API = 26501 as const;
  public static CAMUNDA_GATEWAY_API = 26500 as const;
  public static CAMUNDA_INTERNAL_API = 26502 as const;
  public static CAMUNDA_MONITORING_API = 9600 as const;
  public static CAMUNDA_REST_API = 8080 as const;

  // Elasticsearch
  public static ELASTICSEARCH_REST_API = 9200 as const;

  // Connectors
  public static CONNECTORS_REST_API = 8080 as const;
}
