# Dynamic Configuration Extension Example

This example demonstrates how to extend the Camunda Runtime configuration in a single place with full type safety.

## Adding a New Configuration Property

To add a new configuration property, simply add it to the `CAMUNDA_RUNTIME_CONFIGURATION` object in `CamundaRuntimeConfigurationMap.ts`:

```typescript
export const CAMUNDA_RUNTIME_CONFIGURATION = {
  // ... existing properties ...
  
  // NEW: Add your new configuration property
  newProperty: {
    jsonKey: 'newProperty',
    envKey: 'NEW_PROPERTY_ENV_VAR',
    defaultValue: 'default-value',
    description: 'Description of the new property',
    useVersionResolver: false,
  },
  
  // NEW: Add a property with a specific type
  featureFlag: {
    jsonKey: 'featureFlag',
    envKey: 'FEATURE_FLAG',
    defaultValue: true as boolean,
    description: 'Enable/disable a feature flag',
  },
  
  // NEW: Add a property with union types
  logLevel: {
    jsonKey: 'logLevel',
    envKey: 'LOG_LEVEL',
    defaultValue: 'info' as 'debug' | 'info' | 'warn' | 'error',
    description: 'Logging level for the application',
  },
} as const
```

## What Happens Automatically

Once you add a property to the configuration map:

1. **Type Safety**: The property is automatically included in the `Properties` type
2. **Runtime Initialization**: The property is automatically initialized in the `ContainerRuntimePropertiesUtil` constructor
3. **Property Access**: You can access the property with full type safety:

```typescript
const properties = ContainerRuntimePropertiesUtil.readProperties()

// These properties now exist with proper typing:
console.log(properties.newProperty)       // string
console.log(properties.featureFlag)       // boolean
console.log(properties.logLevel)          // 'debug' | 'info' | 'warn' | 'error'
```

## Benefits

1. **Single Source of Truth**: All configuration is defined in one place
2. **Type Safety**: TypeScript ensures type correctness at compile time
3. **Automatic Resolution**: Properties are automatically resolved from environment variables, JSON files, or defaults
4. **Extensibility**: Easy to add new properties without modifying multiple files
5. **Maintainability**: Changes to configuration structure are automatically reflected throughout the codebase

## Usage in Tests

The flexible typing system allows tests to override properties easily:

```typescript
const properties = new ContainerRuntimePropertiesUtil({
  newProperty: 'test-value',
  featureFlag: false,
  logLevel: 'debug'
})

expect(properties.newProperty).toBe('test-value')
expect(properties.featureFlag).toBe(false)
expect(properties.logLevel).toBe('debug')
```

This approach provides maximum flexibility while maintaining type safety and eliminating the need to manually maintain property definitions in multiple locations.
