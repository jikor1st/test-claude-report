/**
 * 안전한 JSON 직렬화 유틸리티
 * 순환 참조와 특수 객체를 처리합니다.
 */
export function safeStringify(obj: any, indent: number = 2): string {
  const seen = new WeakSet();
  
  return JSON.stringify(obj, (key, value) => {
    // undefined, 함수, 심볼 처리
    if (value === undefined) return '[undefined]';
    if (typeof value === 'function') return '[Function]';
    if (typeof value === 'symbol') return '[Symbol]';
    
    // 객체 타입 처리
    if (typeof value === 'object' && value !== null) {
      // 순환 참조 확인
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
      
      // 특수 객체 처리
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (value instanceof RegExp) {
        return value.toString();
      }
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }
      
      // Buffer나 TypedArray 처리
      if (Buffer.isBuffer(value)) {
        return '[Buffer]';
      }
      if (ArrayBuffer.isView(value)) {
        return '[TypedArray]';
      }
    }
    
    return value;
  }, indent);
}

/**
 * 객체를 읽기 쉬운 문자열로 변환
 */
export function objectToString(obj: any): string {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  
  // 배열인 경우
  if (Array.isArray(obj)) {
    return obj.map(item => objectToString(item)).join('\n');
  }
  
  // 일반 객체인 경우
  if (typeof obj === 'object') {
    try {
      return safeStringify(obj, 2);
    } catch (error) {
      return '[Complex Object]';
    }
  }
  
  return String(obj);
}

/**
 * 중첩된 객체에서 안전하게 값 추출
 */
export function extractTextContent(obj: any): string {
  if (typeof obj === 'string') return obj;
  
  if (Array.isArray(obj)) {
    return obj
      .map(item => extractTextContent(item))
      .filter(Boolean)
      .join('\n');
  }
  
  if (obj && typeof obj === 'object') {
    // text, content, message 등 일반적인 텍스트 필드 확인
    if (obj.text) return extractTextContent(obj.text);
    if (obj.content) return extractTextContent(obj.content);
    if (obj.message) return extractTextContent(obj.message);
    if (obj.value) return extractTextContent(obj.value);
    
    // 다른 필드가 없으면 JSON으로 변환
    return safeStringify(obj);
  }
  
  return '';
}