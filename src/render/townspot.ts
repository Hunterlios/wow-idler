// Przy którym NPC stoi postać w mieście (zakładka okna miasta): quests / trainer / vendor / weapons / stable
let spot = ''
export const setTownSpot = (s: string) => { spot = s }
export const townSpot = () => spot
