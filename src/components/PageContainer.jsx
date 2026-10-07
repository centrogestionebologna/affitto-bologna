function PageContainer({ children }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "800px",
        margin: "0 auto",
        padding: "20px",
        paddingBottom: "100px",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

export default PageContainer;