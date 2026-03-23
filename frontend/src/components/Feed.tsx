import { Avatar, TweetActions } from "./Shared";

interface FeedProps {
    tweetItems: any,
    handleOpenThread: (twts: any) => void
}

const Feed: React.FC<FeedProps> = ({tweetItems, handleOpenThread}) => {
    return (
      <div className="flex flex-col">
        {tweetItems.map((item: any) => {
          if (item.isThread) {
            return (
              <div style={{display: "flex", flexDirection: "column"}} key={item.id} className="border-b border-app-border hover:bg-app-card/30 transition-colors cursor-pointer">
                <div key={item.id} className="border-b border-app-border hover:bg-app-card/10 transition-colors pb-2">
                  {item.tweets.slice(0, 2).map((tweet: any, index: number) => (
                    <article key={tweet.id} className="p-4 relative">
                      {index < 1 && (
                        <div className="absolute left-[38px] top-[60px] bottom-[-20px] w-0.5 bg-app-border" />
                      )}
                      <div className="flex gap-3">
                        <div className="shrink-0 z-10">
                          <Avatar src={tweet.author.avatar} alt={tweet.author.name} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-bold text-app-text truncate">{tweet.author.name}</span>
                            <span className="text-app-muted truncate">{tweet.author.handle}</span>
                            <span className="text-app-muted text-sm">· {tweet.time}</span>
                          </div>
                          <p className="text-app-text text-[15px] leading-relaxed whitespace-pre-wrap">
                            {tweet.content}
                          </p>

                          {tweet.media.length > 0 && (
                            <div
                              className={`mb-3 overflow-hidden border border-app-border rounded-2xl grid gap-1 ${
                                tweet.media.length === 1
                                  ? "grid-cols-1"
                                  : tweet.media.length === 2
                                  ? "grid-cols-2"
                                  : "grid-cols-2"
                              }`}
                            >
                              {tweet.media.map((url: string, idx: number) => (
                                <div
                                  key={idx}
                                  className={`relative ${
                                    tweet.media.length === 3 && idx === 0
                                      ? "col-span-2"
                                      : ""
                                  }`}
                                >
                                  <img
                                    src={url}
                                    alt={`Tweet media ${idx + 1}`}
                                    className="w-full h-full object-cover max-h-[300px]"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          <TweetActions likes={tweet.likes} replies={tweet.replies} reposts={tweet.reposts} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {item.tweets.length > 2 && (
                  <div 
                    onClick={() => handleOpenThread(item.tweets)}
                    className="text-app-muted px-4 pb-3 hover:font-bold text-sm font-medium" style={{padding: "8px 16px 8px 16px", display: "flex", justifyContent: "center", alignItems: "center"}}
                  >
                    See more
                  </div>
                )}
              </div>
            );
          }

          const tweet = item;
          return (
            <article key={tweet.id} className="border-b border-app-border p-4 hover:bg-app-card/30 transition-colors cursor-pointer">
              <div className="flex gap-3">
                <div className="shrink-0">
                  <Avatar src={tweet.author.avatar} alt={tweet.author.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-bold text-app-text truncate">{tweet.author.name}</span>
                    <span className="text-app-muted truncate">{tweet.author.handle}</span>
                    <span className="text-app-muted text-sm">· {tweet.time}</span>
                  </div>
                  
                  <p className="text-app-text text-[15px] leading-relaxed whitespace-pre-wrap mb-3">
                    {tweet.content}
                  </p>

                  {tweet.media.length > 0 && (
                    <div
                      className={`mb-3 overflow-hidden border border-app-border rounded-2xl grid gap-1 ${
                        tweet.media.length === 1
                          ? "grid-cols-1"
                          : tweet.media.length === 2
                          ? "grid-cols-2"
                          : "grid-cols-2"
                      }`}
                    >
                      {tweet.media.map((url: string, idx: number) => (
                        <div
                          key={idx}
                          className={`relative ${
                            tweet.media.length === 3 && idx === 0
                              ? "col-span-2"
                              : ""
                          }`}
                        >
                          <img
                            src={url}
                            alt={`Tweet media ${idx + 1}`}
                            className="w-full h-full object-cover max-h-[300px]"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <TweetActions likes={tweet.likes} replies={tweet.replies} reposts={tweet.reposts} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
}

export default Feed;