import { KnowledgePointCode } from "@/types/game";

export interface MicroSkillDef {
  code: string;
  label: string;
}

export const MICRO_SKILLS: Record<KnowledgePointCode, MicroSkillDef[]> = {
  "QR-01": [
    { code: "sequence_rule", label: "Spot the sequence rule" },
    { code: "next_term", label: "Predict the next term" },
  ],
  "QR-02": [
    { code: "chance_compare", label: "Compare chances" },
    { code: "simple_probability", label: "Calculate simple probability" },
  ],
  "QR-03": [
    { code: "systematic_count", label: "Count systematically" },
    { code: "arrangement_logic", label: "Reason about arrangements" },
  ],
  "QR-04": [
    { code: "ratio_compare", label: "Compare ratios" },
    { code: "ratio_scale", label: "Scale ratios up or down" },
    { code: "unit_rate", label: "Reduce to a unit rate" },
  ],
  "QR-05": [
    { code: "fraction_compare", label: "Compare fractions" },
    { code: "percent_convert", label: "Convert percentages" },
  ],
  "QR-06": [
    { code: "time_rate", label: "Link time and rate" },
    { code: "work_rate", label: "Solve work-rate problems" },
  ],
  "QR-07": [
    { code: "number_deduction", label: "Use numerical deduction" },
    { code: "constraint_tracking", label: "Track constraints carefully" },
  ],
  "QR-08": [
    { code: "table_lookup", label: "Read a table accurately" },
    { code: "table_compare", label: "Compare values from a table" },
  ],
  "QR-09": [
    { code: "chart_reading", label: "Read chart values" },
    { code: "graph_compare", label: "Compare graph trends" },
  ],
  "QR-10": [
    { code: "measurement_select", label: "Select the right measure" },
    { code: "spatial_measure", label: "Reason about shape and measure" },
  ],
  "QR-11": [
    { code: "money_compare", label: "Compare value for money" },
    { code: "profit_loss", label: "Reason about profit and loss" },
  ],
  "QR-12": [
    { code: "set_overlap", label: "Reason about overlap" },
    { code: "venn_count", label: "Count from a Venn diagram" },
  ],
  "QR-13": [
    { code: "logic_elimination", label: "Eliminate impossible cases" },
    { code: "truth_constraints", label: "Use truth constraints" },
  ],
  "QR-14": [
    { code: "symmetry_reading", label: "Read a symmetry pattern" },
    { code: "transformation_tracking", label: "Track a transformation" },
  ],
  "QR-15": [
    { code: "extract_relevant_info", label: "Extract relevant information" },
    { code: "multi_step_plan", label: "Plan a multi-step solution" },
    { code: "check_final_answer", label: "Check the final answer" },
  ],
  "QR-16": [
    { code: "science_pattern", label: "Spot a science pattern" },
    { code: "evidence_reasoning", label: "Use evidence to reason" },
  ],
  "AR-01": [
    { code: "rotation_track", label: "Track rotation" },
    { code: "rotation_consistency", label: "Check rotation consistency" },
  ],
  "AR-02": [
    { code: "reflection_axis", label: "Find the reflection axis" },
    { code: "mirror_compare", label: "Compare mirrored shapes" },
  ],
  "AR-03": [
    { code: "fill_change", label: "Track fill changes" },
    { code: "fill_cycle", label: "Spot a fill cycle" },
  ],
  "AR-04": [
    { code: "size_change", label: "Track size changes" },
    { code: "size_rule", label: "Infer the size rule" },
  ],
  "AR-05": [
    { code: "element_count", label: "Track element count" },
    { code: "count_pattern", label: "Spot a counting pattern" },
  ],
  "AR-06": [
    { code: "position_track", label: "Track position changes" },
    { code: "grid_movement", label: "Read movement on a grid" },
  ],
  "AR-07": [
    { code: "combination_rule", label: "Infer a combination rule" },
    { code: "cell_merge", label: "Merge cell information" },
  ],
  "AR-08": [
    { code: "odd_rule", label: "Find the shared rule" },
    { code: "outlier_identify", label: "Identify the outlier" },
  ],
  "AR-09": [
    { code: "multi_attribute_track", label: "Track multiple attributes" },
    { code: "attribute_priority", label: "Separate overlapping rules" },
  ],
  "AR-10": [
    { code: "analogy_map", label: "Map the analogy" },
    { code: "relation_transfer", label: "Transfer the relationship" },
  ],
  "RC-01": [
    { code: "main_idea", label: "Find the main idea" },
    { code: "purpose_identify", label: "Identify the author's purpose" },
  ],
  "RC-02": [
    { code: "fact_retrieval", label: "Retrieve explicit facts" },
    { code: "detail_scan", label: "Scan for key details" },
  ],
  "RC-03": [
    { code: "infer_feeling", label: "Infer feeling from clues" },
    { code: "infer_motive", label: "Infer motive from context" },
    { code: "infer_unstated_conclusion", label: "Infer the unstated conclusion" },
  ],
  "RC-04": [
    { code: "word_meaning", label: "Infer word meaning from context" },
    { code: "vocab_substitute", label: "Test a substitute meaning" },
  ],
  "RC-05": [
    { code: "structure_reading", label: "Read text structure" },
    { code: "paragraph_role", label: "Identify paragraph roles" },
  ],
  "RC-06": [
    { code: "visual_info_reading", label: "Read visual information" },
    { code: "diagram_compare", label: "Compare diagram details" },
  ],
  "RC-07": [
    { code: "figurative_meaning", label: "Interpret figurative meaning" },
    { code: "tone_analysis", label: "Analyse tone" },
  ],
  "RC-08": [
    { code: "sequence_order", label: "Order events correctly" },
    { code: "cause_effect", label: "Track cause and effect" },
  ],
  "RC-09": [
    { code: "visual_symbolism", label: "Read visual symbolism" },
    { code: "cartoon_purpose", label: "Infer cartoon purpose" },
  ],
};

export function getDefaultMicroSkillCode(
  knowledgePointCode?: string | null,
  variant = 0
): string | undefined {
  if (!knowledgePointCode) return undefined;
  const skills = MICRO_SKILLS[knowledgePointCode as KnowledgePointCode];
  if (!skills || skills.length === 0) return undefined;
  return skills[variant % skills.length]?.code;
}

export function getMicroSkillLabel(microSkillCode?: string | null): string | undefined {
  if (!microSkillCode) return undefined;
  for (const skills of Object.values(MICRO_SKILLS)) {
    const match = skills.find((skill) => skill.code === microSkillCode);
    if (match) return match.label;
  }
  return undefined;
}
