import { CamundaRuntimeConfiguration } from "..";
import { CamundaProcessTestRuntimeDefaults } from "./CamundaProcessTestRuntimeDefaults";
import fs from 'fs'
import Debug from 'debug';
import path from "path";

const debug = Debug('camunda:test:properties');

interface Properties {
    camundaVersion: string;
    camundaDockerImageName: string;
    camundaDockerImageVersion: string;
    connectorsDockerImageName: string;
    connectorsDockerImageVersion: string;
    runtimeMode: 'MANAGED' | 'REMOTE';
}
export class ContainerRuntimePropertiesUtil {

    public static RUNTIME_PROPERTIES_FILE = "camunda-container-runtime.json";

    public static PROPERTY_NAME_CAMUNDA_VERSION = {jsonKey: "camundaVersion" as const, envKey: 'CAMUNDA_DOCKER_IMAGE_VERSION' as const} as const;
    public static PROPERTY_NAME_CAMUNDA_DOCKER_IMAGE_NAME = {jsonKey: "camundaDockerImageName" as const, envKey: 'CAMUNDA_DOCKER_IMAGE_NAME' as const} as const;
    public static PROPERTY_NAME_CAMUNDA_DOCKER_IMAGE_VERSION =
        {jsonKey: "camundaDockerImageVersion" as const, envKey: 'CAMUNDA_DOCKER_IMAGE_VERSION' as const} as const;
    public static PROPERTY_NAME_CONNECTORS_DOCKER_IMAGE_NAME =
        {jsonKey: "connectorsDockerImageName" as const, envKey: 'CONNECTORS_DOCKER_IMAGE_NAME' as const} as const;
    public static PROPERTY_NAME_CONNECTORS_DOCKER_IMAGE_VERSION = {jsonKey: "connectorsDockerImageVersion" as const, envKey: 'CONNECTORS_DOCKER_IMAGE_VERSION' as const} as const;
    public static PROPERTY_NAME_RUNTIME_MODE = {jsonKey: "runtimeMode" as const, envKey: 'CAMUNDA_RUNTIME_MODE' as const} as const;

    public static SNAPSHOT_VERSION = "SNAPSHOT" as const;

    private static SEMANTIC_VERSION_PATTERN = /(\d+)\.(\d+)\.(\d+)(-.*)?/;

    private static PLACEHOLDER_PATTERN = /\$\{.*\}/;

    public camundaVersion;
    public camundaDockerImageName;
    public camundaDockerImageVersion;
    public connectorsDockerImageName;
    public connectorsDockerImageVersion;
    public runtimeMode: 'MANAGED' | 'REMOTE';

    constructor(properties: Partial<Properties> = {}) {
        this.camundaVersion =
            ContainerRuntimePropertiesUtil.getLatestReleasedVersion(
                properties,
                ContainerRuntimePropertiesUtil.PROPERTY_NAME_CAMUNDA_VERSION,
                CamundaProcessTestRuntimeDefaults.DEFAULT_CAMUNDA_DOCKER_IMAGE_VERSION);
   
        this.camundaDockerImageName =
            ContainerRuntimePropertiesUtil.getPropertyOrDefault(
                properties,
                ContainerRuntimePropertiesUtil.PROPERTY_NAME_CAMUNDA_DOCKER_IMAGE_NAME,
                CamundaProcessTestRuntimeDefaults.DEFAULT_CAMUNDA_DOCKER_IMAGE_NAME);

        this.camundaDockerImageVersion =
            ContainerRuntimePropertiesUtil.getLatestReleasedVersion(
                properties,
                ContainerRuntimePropertiesUtil.PROPERTY_NAME_CAMUNDA_DOCKER_IMAGE_VERSION,
                CamundaProcessTestRuntimeDefaults.DEFAULT_CAMUNDA_DOCKER_IMAGE_VERSION);

        this.connectorsDockerImageName =
            ContainerRuntimePropertiesUtil.getPropertyOrDefault(
                properties,
                ContainerRuntimePropertiesUtil.PROPERTY_NAME_CONNECTORS_DOCKER_IMAGE_NAME,
                CamundaProcessTestRuntimeDefaults.DEFAULT_CONNECTORS_DOCKER_IMAGE_NAME);
        this.connectorsDockerImageVersion =
            ContainerRuntimePropertiesUtil.getLatestReleasedVersion(
                properties,
                ContainerRuntimePropertiesUtil.PROPERTY_NAME_CONNECTORS_DOCKER_IMAGE_VERSION,
                CamundaProcessTestRuntimeDefaults.DEFAULT_CONNECTORS_DOCKER_IMAGE_VERSION);

        this.runtimeMode = ContainerRuntimePropertiesUtil.getPropertyOrDefault(
            properties,
            ContainerRuntimePropertiesUtil.PROPERTY_NAME_RUNTIME_MODE,
            CamundaProcessTestRuntimeDefaults.RUNTIME_MODE);

    }

    private static getLatestReleasedVersion(properties: Partial<Properties>, propertyName: {jsonKey: keyof Properties}, defaultValue: string) {
        const propertyValue = properties[propertyName.jsonKey];
        if (propertyValue == null || this.isPlaceholder(propertyValue)) {
            return defaultValue;
        }

        return propertyValue;
    }


    private static isPlaceholder(propertyValue: string) {
        return propertyValue == null || this.PLACEHOLDER_PATTERN.test(propertyValue);
    }

    private static getLatestReleasedVersionByXYZ(
        major: number, minor: number, patch: number, label: string | null): string {

        if (label == null) {
            // release version
            return `${major}.${minor}.${patch}`;
        } else if (!label.includes(ContainerRuntimePropertiesUtil.SNAPSHOT_VERSION)) {
            // alpha, rc or other labeled version
            return `${major}.${minor}.${patch}-${label}`;
        } else if (patch == 0) {
            // current dev version
            return ContainerRuntimePropertiesUtil.SNAPSHOT_VERSION;
        } else {
            // maintenance dev version
            const previousPatchVersion = patch - 1;
            return `${major}.${minor}.${previousPatchVersion}`;
        }
    }

    /**
     * 
     * This should return the property value from the environment variable or version properties.
     */
    private static getPropertyOrDefault(
        versionProperties: Partial<Properties>, propertyName: {jsonKey: keyof Properties, envKey: string}, defaultValue: any) {
        const propertyValue = versionProperties[propertyName.jsonKey];
        if (process.env[propertyName.envKey] == null && (propertyValue == null || ContainerRuntimePropertiesUtil.isPlaceholder(propertyValue))) {
            return defaultValue;

        } else {
            return process.env[propertyName.envKey] ?? propertyValue;
        }
    }

    public static readProperties() {
        return new ContainerRuntimePropertiesUtil(ContainerRuntimePropertiesUtil.readPropertiesFile());
    }

    private static readPropertiesFile() {
        let properties = {}
        const projectRoot = getProjectRoot();
        const configPath = path.join(projectRoot, ContainerRuntimePropertiesUtil.RUNTIME_PROPERTIES_FILE);

        try {
            properties = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

        } catch (e) {
            console.warn(`Can't read properties file: ${configPath}`);
        }
        return properties;
    }
}

function getProjectRoot() {
  // Start from current working directory
  let currentDir = process.cwd();
  
  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  throw new Error('Project root not found');
}
