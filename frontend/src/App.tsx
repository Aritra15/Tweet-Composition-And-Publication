import './App.css'

function App() {
  return (
    <main className="page">
      <section className="composer-card" aria-label="Tweet composer starter">
        <h1>Tweet Composer</h1>


        {/* <label className="input-label" htmlFor="tweetText">
          Write your post
        </label> */}
        <textarea
          id="tweetText"
          rows={8}
          maxLength={280}
          placeholder="What's happening?"
        />

        <button type="button" className="post-button">
          Post
        </button>
      </section>
    </main>
  )
}

export default App
