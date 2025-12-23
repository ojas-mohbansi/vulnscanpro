import { QuizQuestion } from '../../types';
import { fallbackManager } from './fallbackManager';

const SECURITY_QUIZ_PACK: QuizQuestion[] = [
  {
    question: "What HTTP header helps prevent Cross-Site Scripting (XSS) by restricting resource sources?",
    options: ["X-Frame-Options", "Content-Security-Policy", "Strict-Transport-Security", "Access-Control-Allow-Origin"],
    correctAnswer: "Content-Security-Policy",
    explanation: "CSP allows you to restrict where scripts, styles, and other resources can be loaded from, significantly reducing XSS risks."
  },
  {
    question: "Which flag prevents JavaScript from accessing a cookie?",
    options: ["Secure", "SameSite", "HttpOnly", "Domain"],
    correctAnswer: "HttpOnly",
    explanation: "The HttpOnly flag ensures the cookie is sent to the server but is not accessible via client-side JavaScript (document.cookie)."
  },
  {
    question: "In Flask, what setting must be disabled in production to prevent arbitrary code execution?",
    options: ["SECRET_KEY", "DEBUG", "TESTING", "SESSION_COOKIE_SECURE"],
    correctAnswer: "DEBUG",
    explanation: "The Werkzeug debugger (enabled by DEBUG=True) allows executing arbitrary Python code from the browser if an error occurs."
  },
  {
    question: "Which of these is a defense against CSRF attacks?",
    options: ["Anti-forgery tokens", "Encryption", "Strong passwords", "SQL Parameterization"],
    correctAnswer: "Anti-forgery tokens",
    explanation: "Synchronizer Token Pattern (CSRF tokens) ensures that a request originated from a trusted form served by the application."
  },
  {
    question: "What is the risk of setting ALLOWED_HOSTS = ['*'] in Django?",
    options: ["SQL Injection", "Host Header Injection", "Buffer Overflow", "XSS"],
    correctAnswer: "Host Header Injection",
    explanation: "Allowing any host header can lead to cache poisoning or password reset emails with malicious links."
  }
];

export class QuizService {
  static async getQuestions(count: number = 3): Promise<QuizQuestion[]> {
    // 1. Try to get questions from external "free" APIs first to show off the capability, 
    // but fall back to our high-quality static pack if they fail or for stability.
    // Actually, for "Security" specific context, generic trivia APIs are often too broad.
    // We will use the static pack as PRIMARY for quality, and OpenTriviaDB as secondary for variety.
    
    // Mix static questions
    const shuffledStatic = [...SECURITY_QUIZ_PACK].sort(() => 0.5 - Math.random());
    const primaryQuestions = shuffledStatic.slice(0, count);

    // If we want more variety, we fetch from OpenTriviaDB (Science: Computers)
    if (Math.random() > 0.5) { // 50% chance to try fetching dynamic questions
        try {
            const externalQuestions = await this.fetchExternalQuestions(count);
            if (externalQuestions.length > 0) {
                return externalQuestions;
            }
        } catch (e) {
            console.warn("External quiz fetch failed, using static pack.");
        }
    }

    return primaryQuestions;
  }

  private static async fetchExternalQuestions(amount: number): Promise<QuizQuestion[]> {
    const endpoints = [
      `https://opentdb.com/api.php?amount=${amount}&category=18&type=multiple`, // Primary: Open Trivia DB (Computers)
      `https://the-trivia-api.com/api/questions?categories=science&limit=${amount}`, // Fallback 1
      `https://quizapi.io/api/v1/questions?apiKey=DEMO_KEY&limit=${amount}`, // Fallback 2 (Demo key might fail)
      // Mock fallbacks that simulate returning JSON
      `https://raw.githubusercontent.com/VulnScanPro/quiz-packs/main/security-101.json`, 
      `https://jsonplaceholder.typicode.com/posts?_limit=${amount}` // Mock structure
    ];

    const result = await fallbackManager.fetchWithFallback<any>(endpoints, (data) => {
        // Validation for OpenTriviaDB structure
        if (data.results && Array.isArray(data.results)) return true;
        // Validation for generic array
        if (Array.isArray(data)) return true;
        return false;
    });

    if (!result.data) return [];

    // Parse OpenTriviaDB
    if (result.data.results) {
        return result.data.results.map((q: any) => ({
            question: this.decodeHtml(q.question),
            options: [...q.incorrect_answers, q.correct_answer].sort(() => 0.5 - Math.random()).map(a => this.decodeHtml(a)),
            correctAnswer: this.decodeHtml(q.correct_answer),
            explanation: "General Computer Science knowledge."
        }));
    }

    return [];
  }

  private static decodeHtml(html: string) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  }
}
