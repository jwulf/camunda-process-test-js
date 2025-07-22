// Simple test to verify DecisionInstanceAssert compiles correctly
import { DecisionInstanceAssert } from './source/assertions/DecisionInstanceAssert'
import { CamundaProcessTestContext } from './source/runtime/CamundaProcessTestContext'
import { DecisionSelector } from './source/types'

// Test that the class can be instantiated with different selector types
const context = {} as CamundaProcessTestContext

// Test key selector
const keySelector: DecisionSelector = {
	type: 'key',
	value: 'decision-instance-key-123',
}

// Test decisionId selector
const decisionIdSelector: DecisionSelector = {
	type: 'decisionId',
	value: 'my-decision-id',
}

// Test processInstanceKey selector
const processSelector: DecisionSelector = {
	type: 'processInstanceKey',
	value: 'process-instance-key-456',
}

// Test custom selector
const customSelector: DecisionSelector = {
	type: 'custom',
	value: (decision: any) => decision.state === 'EVALUATED',
}

// Verify all selector types work
const assert1 = new DecisionInstanceAssert(context, keySelector, 5000, 100)
const assert2 = new DecisionInstanceAssert(
	context,
	decisionIdSelector,
	5000,
	100
)
const assert3 = new DecisionInstanceAssert(context, processSelector, 5000, 100)
const assert4 = new DecisionInstanceAssert(context, customSelector, 5000, 100)

console.log('DecisionInstanceAssert implementation compiles successfully!')
