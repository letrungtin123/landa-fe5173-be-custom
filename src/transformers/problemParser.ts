// ============================================================
// problemParser.ts — Phân tích HTML của Open edX Problem Block
// Dùng DOMParser bóc tách các loại câu hỏi (radio, checkbox, select, text...)
// ============================================================

export type ProblemType =
  | "single-select"
  | "multi-select"
  | "dropdown"
  | "text-input";

export interface ProblemOption {
  id: string; // The "value" of the input
  text: string; // The label or text
}

export interface ParsedProblem {
  id: string; // Tương đương với name="..." của input, dùng để submit
  type: ProblemType;
  questionHtml: string;
  options?: ProblemOption[]; // Chỉ dành cho select/radio/checkbox
  explanationHtml?: string; // Giải thích khi nộp bài
  hintHtml?: string; // Gợi ý
  hasHints: boolean; // true nếu quiz có cấu hình demand hint trong Studio
}

/**
 * Trích xuất các câu hỏi từ mã HTML Problem trả về của Open edX.
 * Open edX Capa HTML thường có cấu trúc:
 * <div class="problem">
 *   <p>Đề bài</p>
 *   <div class="wrapper-problem-response">
 *     <!-- inputs -->
 *   </div>
 * </div>
 */
export function parseProblemHtml(html: string): ParsedProblem[] {
  if (!html) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const problems: ParsedProblem[] = [];

  // ── Bước đặc biệt: Giải mã data-content ──
  // xblock_view API trả HTML có cấu trúc:
  //   <div class="problems-wrapper" data-content="...HTML-encoded quiz content...">
  //     <p class="loading-spinner">...</p>
  //   </div>
  // Nội dung quiz thực sự (radio, checkbox, v.v.) nằm BÊN TRONG data-content
  // dưới dạng HTML entities. Ta cần decode rồi re-parse.
  const problemsWrapper = doc.querySelector(".problems-wrapper[data-content]");
  let searchDoc: Document | DocumentFragment = doc;

  if (problemsWrapper) {
    const encodedContent = problemsWrapper.getAttribute("data-content") || "";
    if (encodedContent) {
      // Decode HTML entities (DOMParser tự decode khi parse)
      const contentDoc = parser.parseFromString(encodedContent, "text/html");
      searchDoc = contentDoc;
      console.log("[problemParser] ✅ Decoded data-content, searching inside it");
    }
  }

  // Tìm tất cả các container chứa response (inputs)
  const responseWrappers = searchDoc.querySelectorAll(".wrapper-problem-response");

  responseWrappers.forEach((wrapper) => {
    // DEBUG: dump wrapper and its surroundings 
    console.log('[problemParser] wrapper innerHTML:', wrapper.innerHTML.substring(0, 500));
    console.log('[problemParser] wrapper prevSibling:', wrapper.previousElementSibling?.outerHTML?.substring(0, 300));
    console.log('[problemParser] has problem-group-label:', wrapper.querySelector('label.problem-group-label')?.textContent);

    // 1. Phân loại input type
    let type: ProblemType = "text-input";
    let inputName = "";
    const options: ProblemOption[] = [];

    // Check Single Select (radio)
    const radios = wrapper.querySelectorAll("input[type='radio']");
    if (radios.length > 0) {
      type = "single-select";
      inputName = radios[0].getAttribute("name") || "";
      radios.forEach((radio) => {
        const val = radio.getAttribute("value") || "";
        const radioId = radio.getAttribute("id") || "";
        // Open edX: label là sibling trong .field div, linked bằng for="{radioId}"
        const labelEl = radioId
          ? wrapper.querySelector(`label[for='${radioId}']`)
          : radio.closest(".field")?.querySelector("label");
        const text = labelEl?.textContent?.trim() || val;
        options.push({ id: val, text });
      });
    }

    // Check Multi Select (checkbox)
    const checkboxes = wrapper.querySelectorAll("input[type='checkbox']");
    if (checkboxes.length > 0) {
      type = "multi-select";
      inputName = checkboxes[0].getAttribute("name") || "";
      checkboxes.forEach((cb) => {
        const val = cb.getAttribute("value") || "";
        const cbId = cb.getAttribute("id") || "";
        const labelEl = cbId
          ? wrapper.querySelector(`label[for='${cbId}']`)
          : cb.closest(".field")?.querySelector("label");
        const text = labelEl?.textContent?.trim() || val;
        options.push({ id: val, text });
      });
    }

    // Check Dropdown (select)
    const selects = wrapper.querySelectorAll("select");
    if (selects.length > 0) {
      type = "dropdown";
      inputName = selects[0].getAttribute("name") || "";
      const opts = selects[0].querySelectorAll("option");
      opts.forEach((opt) => {
        const val = opt.getAttribute("value") || "";
        if (val) {
          options.push({ id: val, text: opt.textContent?.trim() || val });
        }
      });
    }

    // Check Text/Numerical Input (text)
    const texts = wrapper.querySelectorAll("input[type='text']");
    if (texts.length > 0) {
      type = "text-input";
      inputName = texts[0].getAttribute("name") || "";
    }

    if (!inputName) return; // Không đọc được input name thì bỏ qua



    // 2. Tìm đề bài (question text)
    // Open edX Capa HTML đặt question text ở các vị trí khác nhau:
    // a) Bên trong wrapper: <div class="wrapper-problem-response"><div>Question?</div><div class="choicegroup">...</div></div>
    // b) Bên trên wrapper: <p>Question?</p><div class="wrapper-problem-response">...</div>
    // c) Trong h3.problem-header
    // d) Dropdown: <div>Question?</div><div class="option-input"><select>...</select></div>
    let questionHtml = "";

    // Strategy A: Tìm text bên trong wrapper, trước input container
    // Cho dropdown: input container là .option-input hoặc .inputtype
    const inputContainer = wrapper.querySelector(
      ".choicegroup, .capa_inputtype, .option-input, .optioninput, .inputtype"
    ) || wrapper.querySelector("select, input[type='text']");
    
    if (inputContainer) {
      // Tìm container cha trực tiếp bên trong wrapper
      const closestContainer = inputContainer.closest(
        ".choicegroup, .capa_inputtype, .option-input, .optioninput, .inputtype"
      ) as Element || inputContainer;
      
      const children = Array.from(wrapper.children);
      const inputIdx = children.indexOf(closestContainer);
      
      if (inputIdx > 0) {
        // Lấy tất cả siblings trước input container
        const questionChildren = children.slice(0, inputIdx);
        questionHtml = questionChildren.map(el => el.outerHTML).join("");
      } else if (inputIdx === 0) {
        // Nếu input container là child đầu tiên, tìm text nodes trước nó
        // Cho dropdown: text thường nằm trực tiếp trong wrapper trước .option-input
        const allNodes = Array.from(wrapper.childNodes);
        const containerIdx = allNodes.indexOf(closestContainer as ChildNode);
        if (containerIdx > 0) {
          const questionNodes = allNodes.slice(0, containerIdx);
          questionHtml = questionNodes
            .filter(n => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent?.trim()))
            .map(n => n.nodeType === Node.ELEMENT_NODE ? (n as Element).outerHTML : n.textContent?.trim() || "")
            .join("");
        }
      }
    }

    // Strategy B: Nếu A trống, tìm previous siblings của wrapper (kế hoạch tốt nhất cho numerical/text input nơi câu hỏi nằm ngoài)
    if (!questionHtml.trim()) {
      let prevNode = wrapper.previousElementSibling;
      const explicitLabel = searchDoc.querySelector(`label[for='${selects.length > 0 ? selects[0].id : inputName}']:not(.problem-group-label)`);
      if (explicitLabel) {
        questionHtml = explicitLabel.innerHTML;
      } else {
        const questionParts: string[] = [];
        while (
          prevNode &&
          !prevNode.classList.contains("wrapper-problem-response") &&
          prevNode.tagName !== "H1" && prevNode.tagName !== "H2" && prevNode.tagName !== "H3"
        ) {
          questionParts.unshift(prevNode.outerHTML);
          prevNode = prevNode.previousElementSibling;
        }
        questionHtml = questionParts.join("");
      }
    }

    // Strategy C: Nếu B trống, tìm h3.problem-header (đây thường là tên component, không phải câu hỏi)
    if (!questionHtml.trim()) {
      const problemHeader = searchDoc.querySelector("h3.problem-header, .hd.problem-header");
      if (problemHeader) {
        questionHtml = problemHeader.innerHTML;
      }
    }

    // Fallback
    if (!questionHtml.trim()) {
      questionHtml = "Câu trả lời của bạn là:";
    }

    // ── 3. Tìm Explanation (Giải thích đáp án) ──
    // QUAN TRỌNG: Trong HTML ban đầu (student_view), Open edX KHÔNG gửi nội dung
    // explanation. Element .solution-span tồn tại nhưng RỖNG (display:none).
    // Nội dung chỉ xuất hiện trong response `contents` sau khi user submit quiz.
    let explanationHtml = "";
    
    // Strategy A: .detailed-solution (từ <solution> OLX tag — có trong response sau submit)
    const solutionDiv = wrapper.querySelector(".detailed-solution") || searchDoc.querySelector(".detailed-solution");
    if (solutionDiv && solutionDiv.textContent?.trim()) {
      explanationHtml = solutionDiv.innerHTML;
    }
    
    // Strategy B: .solution-span — chỉ lấy nếu có nội dung thực sự
    if (!explanationHtml) {
      const solutionSpan = wrapper.querySelector(".solution-span") || searchDoc.querySelector(".solution-span");
      if (solutionSpan) {
        const spanContent = solutionSpan.querySelector("span");
        if (spanContent && spanContent.textContent?.trim()) {
          explanationHtml = spanContent.innerHTML;
        }
      }
    }

    // Strategy C: Per-choice feedback (.feedback-hint-text — xuất hiện sau submit)
    if (!explanationHtml) {
      const feedbackHint = wrapper.querySelector(".feedback-hint-text") || searchDoc.querySelector(".feedback-hint-text");
      if (feedbackHint && feedbackHint.textContent?.trim()) {
        explanationHtml = feedbackHint.innerHTML;
      }
    }

    // Strategy D: .explanation block
    if (!explanationHtml) {
      const explanationDiv = wrapper.querySelector(".explanation") || searchDoc.querySelector(".explanation");
      if (explanationDiv && explanationDiv.textContent?.trim()) {
        explanationHtml = explanationDiv.innerHTML;
      }
    }

    // ── 4. Tìm Hint (Gợi ý) ──
    // Open edX hint data KHÔNG có sẵn trong student_view HTML.
    // .problem-hint chứa buttons (Next Hint, Review) nhưng KHÔNG chứa hint text.
    // .demandhint cũng chỉ chứa buttons.
    // Hint text chỉ xuất hiện KHI:
    //   1. User click "Hint" → edX JS gọi hint_button handler → inject .hint-text vào DOM
    //   2. Response sau submit (contents field) có thể chứa hint
    //
    // => Parser CHỈ lấy hint từ .hint-text (nội dung thực sự đã rendered)
    // => KHÔNG bao giờ lấy từ .problem-hint hay .demandhint (chỉ có button text)
    let hintHtml = "";
    
    // Strategy A: .hint-text elements — NỘI DUNG HINT THỰC SỰ
    // Chỉ xuất hiện sau khi edX JS đã render hint (qua hint_button handler)
    const hintTextEls = searchDoc.querySelectorAll(".hint-text");
    if (hintTextEls.length > 0) {
      const texts = Array.from(hintTextEls)
        .map(h => h.textContent?.trim())
        .filter(Boolean);
      if (texts.length > 0) {
        hintHtml = Array.from(hintTextEls)
          .map(h => h.innerHTML.trim())
          .filter(Boolean)
          .join("<br/>");
      }
    }
    // Strategy A là nguồn duy nhất đáng tin cậy cho hint content.
    // .problem-hint và .demandhint LUÔN chứa button text (Next Hint, Review),
    // KHÔNG BAO GIỜ chứa nội dung hint thực sự trong student_view HTML ban đầu.
    // Hint thực sự chỉ có qua:
    //   1. .hint-text elements (sau khi edX JS render)
    //   2. Nút "Xem gợi ý" custom (gọi hint_button API)

    // ── 5. Detect hint availability ──
    // edX problem.html template renders <button class="hint-button"> ONLY when
    // demand_hint_possible is true (i.e. quiz has <demandhint><hint> configured in Studio).
    // We also check for .problem-hint container and .demandhint as fallback markers.
    const hasHints = !!(
      searchDoc.querySelector("button.hint-button") ||
      searchDoc.querySelector(".problem-hint") ||
      searchDoc.querySelector(".demandhint")
    );

    problems.push({
      id: inputName,
      type,
      questionHtml,
      options: type !== "text-input" ? options : undefined,
      explanationHtml: explanationHtml.trim() || undefined,
      hintHtml: hintHtml.trim() || undefined,
      hasHints,
    });
  });

  return problems;
}

