export const LUA_SPLIT_DEF = `
-- split("a,b,c", ",") => {"a", "b", "c"}
local function split(s, sep)
    local fields = {}

    local sep = sep or " "
    local pattern = string.format("([^%s]+)", sep)
    string.gsub(s, pattern, function(c) fields[#fields + 1] = c end)

    return fields
end
`;