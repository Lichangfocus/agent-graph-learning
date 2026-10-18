/** 公开框架仓库的隐私规则：个人数据包路径不得被跟踪（examples/demo-pack 与 历史/ 例外）。 */
const FORBIDDEN_DIRS = /(^|\/)(profile|log|units-private|annotations|overlay|revisions)\//;
const FORBIDDEN_NAMES = [/course-q4-2026\.md$/, /q4-civilization-history\.md$/, /learner-profile-focus/, /(^|\/)\.env(?!\.example)/];

export function privacyViolations(paths: string[]): string[] {
  return paths.filter((p) => !p.startsWith("examples/demo-pack/") && !p.startsWith("历史/")
    && (FORBIDDEN_DIRS.test(p) || FORBIDDEN_NAMES.some((re) => re.test(p))));
}
