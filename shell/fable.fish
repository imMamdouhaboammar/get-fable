# get-fable Fish Shell Integration & Prompt Hook

function _fable_in_project
    test -d .fable -o -f .fable/state.json
end

function _fable_update_spark_hint --on-event fish_prompt
    if _fable_in_project
        if type -q get-fable
            set -gx FABLE_SPARK_HINT (get-fable spark 2>/dev/null)
        else if test -f ./bin/get-fable.js
            set -gx FABLE_SPARK_HINT (bun ./bin/get-fable.js spark 2>/dev/null)
        end
    else
        set -e FABLE_SPARK_HINT
    end
end

abbr -a gfr "get-fable route"
abbr -a gfs "get-fable spark"
abbr -a gfe "get-fable evidence"
abbr -a gfc "get-fable card"
abbr -a gfl "get-fable lint"
abbr -a gfd "get-fable doctor"
abbr -a gfm "get-fable mutation"
abbr -a gfst "get-fable status"
