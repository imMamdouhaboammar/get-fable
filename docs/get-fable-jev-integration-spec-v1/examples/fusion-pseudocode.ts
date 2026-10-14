export function fuseRoute(input: {
  deterministic: RoutingDecision;
  advice: ReflexAdvice | null;
  policy: HardPolicySnapshot;
  mode: ReflexMode;
  thresholds: ThresholdProfile;
  registry: SkillRegistry;
}): RouteResolution {
  const { deterministic, advice, policy, mode } = input;

  if (mode === 'off' || !advice) {
    return deterministicResolution(deterministic, mode);
  }

  if (policy.hardLocked) {
    return resolution(deterministic, {
      overrideApplied: false,
      reason: policy.lockReason,
      advice,
    });
  }

  if (mode === 'shadow' || mode === 'recommend') {
    return resolution(deterministic, { overrideApplied: false, advice });
  }

  if (!advice.selectedSkill || !isCanonicalSkill(advice.selectedSkill, input.registry)) {
    return resolution(deterministic, { overrideApplied: false, advice });
  }

  const threshold = thresholdFor(advice.selectedSkill, input.thresholds);
  const margin = topTwoMargin(advice.probabilities);

  if ((advice.confidence ?? 0) < threshold || margin < input.thresholds.minMargin) {
    return resolution(deterministic, { overrideApplied: false, advice });
  }

  if (conflictsWithSuppression(advice.selectedSkill, policy)) {
    return resolution(deterministic, { overrideApplied: false, advice });
  }

  const decision = rebuildCanonicalDecision(advice.selectedSkill, deterministic, input.registry);
  return resolution(decision, { overrideApplied: true, advice });
}
