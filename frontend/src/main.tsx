import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { HomePage } from './pages/HomePage'
import { CurriculumPage } from './pages/CurriculumPage'
import { LearnPage } from './pages/LearnPage'
import { QuizPage } from './pages/QuizPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/curriculum/:id" element={<CurriculumPage />} />
        <Route path="/curriculum/:id/learn" element={<LearnPage />} />
        <Route path="/curriculum/:id/learn/:topicKey" element={<LearnPage />} />
        <Route path="/curriculum/:id/quiz/:topicKey" element={<QuizPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
