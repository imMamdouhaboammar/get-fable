# get-fable Bash Integration & Prompt Hook

_fable_in_project() {
  [ -d ".fable" ] || [ -f ".fable/state.json" ]
}

_fable_update_spark_hint() {
  if _fable_in_project; then
    local spark_out
    if command -v get-fable >/dev/null 2>&1; then
      spark_out=$(get-fable spark 2>/dev/null)
    elif [ -f "./bin/get-fable.js" ]; then
      spark_out=$(bun ./bin/get-fable.js spark 2>/dev/null)
    fi
    if [ -n "$spark_out" ]; then
      export FABLE_SPARK_HINT="$spark_out"
    else
      unset FABLE_SPARK_HINT
    fi
  else
    unset FABLE_SPARK_HINT
  fi
}

_fable_prompt_command() {
  _fable_update_spark_hint
}

if [[ ! "$PROMPT_COMMAND" =~ _fable_prompt_command ]]; then
  PROMPT_COMMAND="_fable_prompt_command; $PROMPT_COMMAND"
fi

alias gfr="get-fable route"
alias gfs="get-fable spark"
alias gfe="get-fable evidence"
alias gfc="get-fable card"
alias gfl="get-fable lint"
alias gfd="get-fable doctor"
alias gfm="get-fable mutation"
alias gfst="get-fable status"
