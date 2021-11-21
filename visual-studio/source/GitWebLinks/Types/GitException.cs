#nullable enable

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

namespace GitWebLinks;

[Serializable]
[SuppressMessage("Design", "CA1032:Implement standard exception constructors", Justification = "Internal use only.")]
public class GitException : Exception {

    public GitException(string message) : base(message) { }


    protected GitException(SerializationInfo info, StreamingContext context) : base(info, context) { }

}
