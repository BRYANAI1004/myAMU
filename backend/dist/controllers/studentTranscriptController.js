import { getStudentTranscriptPreviewPayload } from "../services/studentTranscriptService.js";
function pathStudentId(req) {
    const v = req.params.studentId;
    if (Array.isArray(v))
        return v[0] ?? "";
    return v ?? "";
}
export async function getStudentTranscriptPreview(req, res) {
    try {
        const sid = pathStudentId(req).trim();
        if (sid === "") {
            res.status(400).json({ error: "Missing student id" });
            return;
        }
        const payload = await getStudentTranscriptPreviewPayload(sid);
        res.json(payload);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load transcript preview" });
    }
}
//# sourceMappingURL=studentTranscriptController.js.map