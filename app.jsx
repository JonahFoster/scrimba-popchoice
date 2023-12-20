import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { openai, supabase } from './config.js'
import logo from './logo.png'

function App() {
    const [formStatus, setFormStatus] = useState("start")
    const [personNumber, setPersonNumber] = useState(1)
    const [totalPeople, setTotalPeople] = useState(0)
    const [desiredRuntime, setDesiredRuntime] = useState('')
    const [formData, setFormData] = useState([])
    const [aiResponseData, setAiResponseData] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [currentMovieIndex, setCurrentMovieIndex] = useState(0)
    
    function handleStartSubmit(e) {
        e.preventDefault() 
        const peopleInput = document.querySelector('.start-input[type="text"]').value 
        const runtimeInput = document.querySelector('.start-input[type="text"]:nth-child(2)').value 
        setTotalPeople(parseInt(peopleInput) || 0) 
        setDesiredRuntime(runtimeInput) 
        setFormStatus("questions") 
    }

    function handleQuestionSubmit(e) {
        e.preventDefault()
        const favoriteMovieElement = document.getElementById(`favoriteMovie${personNumber}`)
        const agePreferenceElement = document.querySelector(`input[name="agePreference${personNumber}"]:checked`)
        const moodElement = document.querySelector(`input[name="mood${personNumber}"]:checked`)
        const filmPersonElement = document.getElementById(`filmPerson${personNumber}`)

        const currentFormData = {
            favoriteMovie: favoriteMovieElement ? favoriteMovieElement.value : '',
            agePreference: agePreferenceElement ? agePreferenceElement.value : '',
            mood: moodElement ? moodElement.value : '',
            filmPerson: filmPersonElement ? filmPersonElement.value : ''
        } 

        const updatedFormData = [...formData, currentFormData] 

        if (personNumber < totalPeople) {
            setFormData(updatedFormData) 
            setPersonNumber(prevNumber => prevNumber + 1) 
            document.getElementById(`favoriteMovie${personNumber}`).value = '' 
            document.getElementById(`filmPerson${personNumber}`).value = '' 
            window.scrollTo(0, 0) 
        } else {
            window.scrollTo(0, 0)
            setIsLoading(true)
            const formattedData = formatFormData(updatedFormData) 
            console.log(formattedData)   // Log or process the formatted data
            processResults(formattedData)
            setFormStatus("output") 
        }
    }
    
    function handleOutputSubmit() {
        setFormStatus("start") 
        setPersonNumber(1) 
        setTotalPeople(0) 
        setDesiredRuntime('') 
        setFormData([]) 
        setAiResponseData(null) 
        setIsLoading(false) 
    }
    
    function handlePersonNumber() {
        setPersonNumber(prevNumber => prevNumber + 1)
    }
    
    async function processResults(input) {
        try {
            const embedding = await createEmbedding(input) 
            const match = await findMatch(embedding) 
            await getChatCompletion(match, input) 
        } catch (error) {
            console.error('Error in main function.', error) 
        } finally {
            setIsLoading(false) 
        }
    }
    
    async function createEmbedding(input) {
        const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input
        })
        return embeddingResponse.data[0].embedding
    }
    
    async function findMatch(embedding) {
        const { data } = await supabase.rpc('match_movies', {
            query_embedding: embedding,
            match_threshold: 0.50,
            match_count: 5
        })
  
        // Manage multiple returned matches
        const match = data.map(obj => obj.content).join('\n')
        console.log(match)
        return match
    }
    
    const chatMessages = [{
        role: 'system',
        content: `As a knowledgeable movie expert, your task is to recommend five movies that align with the diverse tastes of multiple people. For each movie, provide its title, release year, and a brief description under 30 words. Format each movie recommendation as a JSON object and return them in an array. Each object should look like this: {"title": "Movie Title", "year": "Release Year", "description": "Brief Description"}. If you are unable to find suitable movies, respond with an array containing a single object: [{"error": "No suitable movies found"}]. Please do not make up results.`
    }] 

    async function getChatCompletion(text, query) {
        chatMessages.push({
            role: 'user',
            content: `Context: ${text} Question: ${query}`
        })
        
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: chatMessages,
            temperature: 0.5,
            frequency_penalty: 0.5
        })
        console.log(response.choices[0].message.content)
        const aiResponse = JSON.parse(response.choices[0].message.content)
        setAiResponseData(aiResponse)
    }
    
    function formatFormData(formData) {
        let formattedData = `Total People: ${totalPeople}\n` +
                            `Desired Movie Runtime: ${desiredRuntime}\n` +
                            `Individual Preferences: \n\n`

        formattedData += formData.map((data, index) => {
            return `Person ${index + 1}: \n` +
                `  - Favorite Movie: ${data.favoriteMovie}\n` +
                `  - Age of Movie Preference: ${data.agePreference}\n` +
                `  - Movie Mood Preference: ${data.mood}\n` +
                `  - Favorite Film Person Choice: ${data.filmPerson}` 
        }).join('\n\n') 

        return formattedData 
    }

    return (
        <main>
            {formStatus === "start" && (
            <div>
                <div className="header start">
                    <img className="logo" src={logo} />
                    <h1>PopChoice</h1>
                </div>
                <div className="start-inputs">
                    <input placeholder="How many people?" className="start-input" type="text" />
                    <input placeholder="How much time do you have?" className="start-input" type="text" />
                    <button className="submit-button" onClick={handleStartSubmit}>Start</button>
                </div>
            </div>
            )}

            {formStatus === "questions" && (
            <div>
                <div className="header questions">
                    <img className="logo" src={logo} />
                    <h1>{personNumber}</h1>
                </div>
                <form className="questions-container" onSubmit={handleQuestionSubmit}>
                    <div className="question-section">
                        <label className="question-label" htmlFor={`favoriteMovie${personNumber}`}>What’s your favorite movie?</label>
                        <input 
                            name={`favoriteMovie${personNumber}`} 
                            id={`favoriteMovie${personNumber}`} 
                            className="question-text-input large" 
                            type="text" />
                    </div>
                    <div className="question-section">
                        <label className="question-label">Are you in the mood for something new or a classic?</label>
                        <div className="question-radio-group">
                            <input 
                                type="radio" 
                                id={`60s${personNumber}`}
                                name={`agePreference${personNumber}`}
                                value="60s" 
                                className="hidden" />
                            <label 
                                htmlFor={`60s${personNumber}`} 
                                className="question-radio-input">60s
                            </label>
                            <input 
                                type="radio" 
                                id={`70s${personNumber}`}
                                name={`agePreference${personNumber}`}
                                value="70s" 
                                className="hidden" />
                            <label 
                                htmlFor={`70s${personNumber}`} 
                                className="question-radio-input">70s
                            </label>
                            <input 
                                type="radio" 
                                id={`80s${personNumber}`}
                                name={`agePreference${personNumber}`}
                                value="80s" 
                                className="hidden" />
                            <label 
                                htmlFor={`80s${personNumber}`} 
                                className="question-radio-input">80s
                            </label>
                            <input 
                                type="radio" 
                                id={`90s${personNumber}`}
                                name={`agePreference${personNumber}`}
                                value="90s" 
                                className="hidden" />
                            <label 
                                htmlFor={`90s${personNumber}`} 
                                className="question-radio-input">90s
                            </label>
                            <input 
                                type="radio" 
                                id={`00s${personNumber}`}
                                name={`agePreference${personNumber}`}
                                value="00s" 
                                className="hidden" />
                            <label 
                                htmlFor={`00s${personNumber}`} 
                                className="question-radio-input">00s
                            </label>
                            <input 
                                type="radio" 
                                id={`10s${personNumber}`}
                                name={`agePreference${personNumber}`}
                                value="10s" 
                                className="hidden" />
                            <label 
                                htmlFor={`10s${personNumber}`} 
                                className="question-radio-input">10s
                            </label>
                            <input 
                                type="radio" 
                                id={`new${personNumber}`}
                                name={`agePreference${personNumber}`}
                                value="new" 
                                className="hidden" />
                            <label 
                                htmlFor={`new${personNumber}`} 
                                className="question-radio-input">New
                            </label>
                            <input 
                                type="radio" 
                                id={`classic${personNumber}`}
                                name={`agePreference${personNumber}`}
                                value="classic" 
                                className="hidden" />
                            <label 
                                htmlFor={`classic${personNumber}`} 
                                className="question-radio-input">Classic
                            </label>
                        </div>   
                    </div>
                    <div className="question-section">
                        <label className="question-label">What are you in the mood for?</label>
                        <div className="question-radio-group">
                            <input 
                                type="radio" 
                                id={`fun${personNumber}`} 
                                name={`mood${personNumber}`} 
                                value="fun" 
                                className="hidden" />
                            <label 
                                htmlFor={`fun${personNumber}`} 
                                className="question-radio-input">Fun
                            </label>
                            <input 
                                type="radio" 
                                id={`serious${personNumber}`} 
                                name={`mood${personNumber}`}
                                value="serious" 
                                className="hidden" />
                            <label 
                                htmlFor={`serious${personNumber}`} 
                                className="question-radio-input">Serious
                            </label>
                            <input 
                                type="radio" 
                                id={`inspiring${personNumber}`}
                                name={`mood${personNumber}`} 
                                value="inspiring" 
                                className="hidden" />
                            <label 
                                htmlFor={`inspiring${personNumber}`} 
                                className="question-radio-input">Inspiring
                            </label>
                            <input 
                                type="radio" 
                                id={`scary${personNumber}`} 
                                name={`mood${personNumber}`} 
                                value="scary" 
                                className="hidden" />
                            <label 
                                htmlFor={`scary${personNumber}`} 
                                className="question-radio-input">Scary
                            </label>
                            <input 
                                type="radio" 
                                id={`romantic${personNumber}`} 
                                name={`mood${personNumber}`} 
                                value="romantic" 
                                className="hidden" />
                            <label 
                                htmlFor={`romantic${personNumber}`} 
                                className="question-radio-input">Romance
                            </label>
                            <input 
                                type="radio" 
                                id={`mysterious${personNumber}`} 
                                name={`mood${personNumber}`} 
                                value="mysterious" 
                                className="hidden" />
                            <label 
                                htmlFor={`mysterious${personNumber}`} 
                                className="question-radio-input">Mystery
                            </label>
                            <input 
                                type="radio" 
                                id={`comical${personNumber}`} 
                                name={`mood${personNumber}`} 
                                value="comical" 
                                className="hidden" />
                            <label 
                                htmlFor={`comical${personNumber}`} 
                                className="question-radio-input">Comedy
                            </label>
                        </div>
                    </div>
                    <div className="question-section">
                        <label className="question-label" htmlFor={`filmPerson${personNumber}`}>Who is your favorite film person?</label>
                        <input 
                            name={`filmPerson${personNumber}`} 
                            id={`filmPerson${personNumber}`} 
                            className="question-text-input small" 
                            type="text" />
                    </div>
                    <button className="submit-button question-btn" type="submit">
                        {personNumber === totalPeople ? "Get Movie" : "Next Person"}
                    </button>
                </form>
            </div>
            )}

            {formStatus === "output" && ( isLoading ? (
        <p className="question-label">Loading movie recommendations...</p>
    ) : aiResponseData && aiResponseData.length > 0 ? (
        <div className="output-container">
            <div className="header output">
                <img className="logo" src={logo} />
                <h1>PopChoice</h1>
            </div>
            <p className="question-label">Your suggested movie is:</p>
            <h2 id="output-heading">{aiResponseData[currentMovieIndex].title} ({aiResponseData[currentMovieIndex].year})</h2>
            <p className="question-label output-text">{aiResponseData[currentMovieIndex].description}</p>
            {currentMovieIndex > 0 && (
                <button className="submit-button output-btn" onClick={() => setCurrentMovieIndex(currentMovieIndex - 1)}>
                    Previous Movie
                </button>
            )}
            {currentMovieIndex < aiResponseData.length - 1 && (
                <button className="submit-button output-btn" onClick={() => setCurrentMovieIndex(currentMovieIndex + 1)}>
                    Next Movie
                </button>
            )}
            <button className="submit-button output-btn" onClick={handleOutputSubmit}>
                Go Again
            </button>
        </div>
    ) : (
        <div>
            <p className="question-label">No suitable movies found.</p>
            <button className="submit-button" onClick={handleOutputSubmit}>
                Try Again
            </button>
        </div>
    )
)}
        </main>
    ) 
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />) 
