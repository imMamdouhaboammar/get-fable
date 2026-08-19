# get-fable bash completion

_get_fable_completion() {
  local cur prev commands
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"

  commands="install install-antigravity install-codex install-cursor install-git-hooks init route spark state mutation card evidence doctor shell serve lint status assets prompt version help"

  if [ $COMP_CWORD -eq 1 ]; then
    COMPREPLY=( $(compgen -W "${commands}" -- ${cur}) )
    return 0
  fi

  case "${prev}" in
    evidence)
      COMPREPLY=( $(compgen -W "pass fail" -- ${cur}) )
      return 0
      ;;
    shell)
      COMPREPLY=( $(compgen -W "zsh bash fish init" -- ${cur}) )
      return 0
      ;;
    install)
      COMPREPLY=( $(compgen -W "all claude antigravity codex cursor opencode kimi deepseek kiro pi git shell" -- ${cur}) )
      return 0
      ;;
  esac
}

complete -F _get_fable_completion get-fable
